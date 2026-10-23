import { AwsClient } from "aws4fetch";

/**
 * Almacenamiento de archivos en Cloudflare R2 (S3-compatible) con URLs firmadas de corta duración
 * (ADR-019, ADR-039). Bucket privado de plataforma; prefijo por tenant en la clave del objeto.
 */
export type ObjetoAlmacenado = { tamano: number; mime: string | null };

export interface Almacenamiento {
  readonly disponible: boolean;
  urlSubida(clave: string, mime: string, segundos?: number): Promise<string>;
  urlDescarga(clave: string, nombre: string, segundos?: number): Promise<string>;
  head(clave: string): Promise<ObjetoAlmacenado | null>;
  eliminar(clave: string): Promise<void>;
}

type ConfigR2 = { accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string };

export function configR2(env: Record<string, string | undefined> = process.env): ConfigR2 | null {
  const c = {
    accountId: env["R2_ACCOUNT_ID"],
    accessKeyId: env["R2_ACCESS_KEY_ID"],
    secretAccessKey: env["R2_SECRET_ACCESS_KEY"],
    bucket: env["R2_BUCKET"],
  };
  return c.accountId && c.accessKeyId && c.secretAccessKey && c.bucket ? (c as ConfigR2) : null;
}

const codificar = (clave: string) => clave.split("/").map(encodeURIComponent).join("/");

export function almacenamientoR2(config: ConfigR2): Almacenamiento {
  const cliente = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: "auto",
  });
  const base = `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}`;
  const firmar = async (url: URL, method: string, headers?: Record<string, string>) =>
    (
      await cliente.sign(new Request(url, { method, ...(headers ? { headers } : {}) }), {
        aws: { signQuery: true },
      })
    ).url;
  return {
    disponible: true,
    urlSubida(clave, mime, segundos = 600) {
      const url = new URL(`${base}/${codificar(clave)}`);
      url.searchParams.set("X-Amz-Expires", String(segundos));
      return firmar(url, "PUT", { "content-type": mime });
    },
    urlDescarga(clave, nombre, segundos = 300) {
      const url = new URL(`${base}/${codificar(clave)}`);
      url.searchParams.set("X-Amz-Expires", String(segundos));
      url.searchParams.set(
        "response-content-disposition",
        `inline; filename*=UTF-8''${encodeURIComponent(nombre)}`,
      );
      return firmar(url, "GET");
    },
    async head(clave) {
      const r = await cliente.fetch(`${base}/${codificar(clave)}`, { method: "HEAD" });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`R2 respondió ${r.status} al consultar el archivo.`);
      return {
        tamano: Number(r.headers.get("content-length") ?? 0),
        mime: r.headers.get("content-type"),
      };
    },
    async eliminar(clave) {
      const r = await cliente.fetch(`${base}/${codificar(clave)}`, { method: "DELETE" });
      if (!r.ok && r.status !== 404) throw new Error(`R2 respondió ${r.status} al eliminar.`);
    },
  };
}

/** Sin credenciales (desarrollo, CI): toda operación falla con un mensaje claro. */
export const almacenamientoNoDisponible: Almacenamiento = {
  disponible: false,
  urlSubida: () => Promise.reject(new Error("Almacenamiento no configurado en este entorno.")),
  urlDescarga: () => Promise.reject(new Error("Almacenamiento no configurado en este entorno.")),
  head: () => Promise.reject(new Error("Almacenamiento no configurado en este entorno.")),
  eliminar: () => Promise.reject(new Error("Almacenamiento no configurado en este entorno.")),
};

export function almacenamientoDelEntorno(env: Record<string, string | undefined> = process.env) {
  const c = configR2(env);
  return c ? almacenamientoR2(c) : almacenamientoNoDisponible;
}
