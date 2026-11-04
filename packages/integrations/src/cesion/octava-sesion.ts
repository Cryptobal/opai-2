// Sesión Octava por tenant: registro único del cedente (PassAccesoApi) y token de 6 h.
// Lo que persiste lo decide el llamador (`AlmacenSesionOctava`): aquí no hay base ni process.env.
import type { OctavaAmbiente } from "./octava-api";
import type { ClienteOctava } from "./octava-cliente";
import { sinNull } from "./octava-http";

/** usuario = RUT de la empresa integradora que contrató Octava; clave = su contraseña. */
export type CredencialesOctava = { usuario: string; clave: string };

export type CedenteOctava = {
  rut: string;
  razonSocial: string;
  direccion: string;
  email: string;
  contactoNombre: string;
  contactoEmail: string;
  /** Titular del certificado (RUT y nombre leídos del .pfx). */
  rutTitular: string;
  nombreTitular: string;
  /** Certificado del cedente (el mismo de la emisión DTE); null si el tenant aún no lo cargó. */
  certificado: { pfxBase64: string; clave: string } | null;
};

export interface AlmacenSesionOctava {
  leerPassAcceso(): Promise<string | null>;
  guardarPassAcceso(pass: string): Promise<void>;
  leerToken(): Promise<{ token: string; expiraEn: number } | null>;
  guardarToken(t: { token: string; expiraEn: number } | null): Promise<void>;
}

export type DepsSesion = {
  cliente: ClienteOctava;
  integrador: CredencialesOctava;
  cedente: CedenteOctava;
  almacen: AlmacenSesionOctava;
  ahora: () => number;
};

export const TOKEN_TTL_MS = 5.5 * 60 * 60 * 1000; // margen frente a las 6 h reales
export const ambienteOctava = (a: "certificacion" | "produccion"): OctavaAmbiente => (a === "produccion" ? "1" : "0");

export function formatoRutOctava(raw: string): string {
  const limpio = raw.replace(/[.\-\s]/g, "").toUpperCase();
  return limpio.length < 2 ? raw.trim() : `${limpio.slice(0, -1)}-${limpio.slice(-1)}`;
}

export function limitarTexto(valor: string | undefined, max: number, respaldo: string): string {
  const limpio = [...(valor ?? "")].map((c) => (c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 ? " " : c)).join("");
  const t = limpio.trim() || respaldo;
  return t.slice(0, max);
}

export async function asegurarPassAcceso(d: DepsSesion): Promise<string> {
  const guardada = await d.almacen.leerPassAcceso();
  if (guardada) return guardada;
  const { cedente: c, integrador: i } = d;
  if (!c.certificado) {
    throw new Error(
      "Octava: falta el certificado digital (.pfx) del cedente. Cárguelo en Configuración → Integraciones → Emisión DTE.",
    );
  }
  const res = await d.cliente.registraCedente({
    RUT: formatoRutOctava(c.rut),
    RAZONSOCIAL: limitarTexto(c.razonSocial, 100, "Sin Razon Social"),
    RUTAUTORIZADOSII: formatoRutOctava(c.rutTitular),
    NOMBREAUTORIZADOSII: limitarTexto(c.nombreTitular, 60, "Representante Legal"),
    CERTDIGBASE64: c.certificado.pfxBase64,
    PASSCERTDIG: c.certificado.clave,
    INTEGRADOR: formatoRutOctava(i.usuario),
    PASSWORDINTEGRADOR: i.clave,
  });
  const pass = sinNull(res.PassAccesoApi);
  const yaExiste = res.IdResultadoFE === "3" || /ya existe RUT/i.test(res.ResultadoFE ?? "");
  if (yaExiste && !pass) {
    throw new Error(
      "Octava: el RUT del cedente ya está registrado, pero OPAI no tiene su clave de acceso (PassAccesoApi). " +
        `Pídala al soporte de Octava. Detalle (${res.IdResultadoFE}): ${res.ResultadoFE ?? ""}`,
    );
  }
  if (res.IdResultadoFE !== "0" || !pass) {
    throw new Error(`Octava RegistraCedente falló (${res.IdResultadoFE ?? "?"}): ${res.ResultadoFE ?? res.message ?? ""}`);
  }
  await d.almacen.guardarPassAcceso(pass);
  return pass;
}

export async function asegurarToken(d: DepsSesion, forzar = false): Promise<string> {
  const previo = await d.almacen.leerToken();
  if (!forzar && previo && previo.expiraEn > d.ahora() + 60_000) return previo.token;
  const pass = await asegurarPassAcceso(d);
  const res = await d.cliente.obtenerToken({
    RUTACCESOAPI: formatoRutOctava(d.cedente.rut),
    PASSWORDACCESOAPI: pass,
  });
  const token = sinNull(res.Token);
  const ok = res.DescripcionResultado === "TOK" || res.DescripcionResultado === "TDUP";
  if (token && ok) {
    await d.almacen.guardarToken({ token, expiraEn: d.ahora() + TOKEN_TTL_MS });
    return token;
  }
  // TDUP sin token nuevo: Octava no devuelve el activo; si aún lo tenemos, se reutiliza.
  if (res.DescripcionResultado === "TDUP" && previo && !forzar) return previo.token;
  throw new Error(`Octava ObtenerToken falló (${res.DescripcionResultado ?? "?"}): ${res.message ?? "sin mensaje"}`);
}
