import { bytesDeXml } from "./xml-iso";
import { encabezadoAuthSimpleApi } from "./simpleapi-contrato";

export type ParteMultipart = { nombre: string; valor: string | Blob; nombreArchivo?: string };

/** POST multipart con la API key en `Authorization`. La llamada nunca corre dentro de una transacción de base. */
export async function postMultipartSimpleApi(
  url: string,
  apiKey: string,
  partes: readonly ParteMultipart[],
): Promise<Response> {
  const form = new FormData();
  for (const p of partes) {
    if (typeof p.valor === "string") form.append(p.nombre, p.valor);
    else form.append(p.nombre, p.valor, p.nombreArchivo ?? "archivo.bin");
  }
  return fetch(url, { method: "POST", headers: { Authorization: encabezadoAuthSimpleApi(apiKey) }, body: form });
}

export function blobBase64(base64: string, tipo: string): Blob {
  return new Blob([Buffer.from(base64, "base64")], { type: tipo });
}

/** El XML de un DTE sale como los mismos bytes ISO-8859-1 que se recibieron (ADR-075), nunca como UTF-8. */
export function blobXml(xmlLatin1: string): Blob {
  return new Blob([new Uint8Array(bytesDeXml(xmlLatin1))], { type: "application/xml; charset=iso-8859-1" });
}

/** Mensaje de error sin el cuerpo completo (puede traer datos del documento) y sin secretos. */
async function errorHttp(res: Response): Promise<Error> {
  const cuerpo = await res.text().catch(() => "");
  return new Error(`SimpleAPI HTTP ${res.status}${cuerpo ? `: ${cuerpo.slice(0, 200)}` : ""}`);
}

export async function leerJsonRespuesta<T>(res: Response): Promise<T> {
  if (!res.ok) throw await errorHttp(res);
  return (await res.json()) as T;
}

/** Respuesta XML como bytes (ISO-8859-1): nunca pasa por `res.text()`, que decodificaría como UTF-8. */
export async function leerBytesRespuesta(res: Response): Promise<Buffer> {
  if (!res.ok) throw await errorHttp(res);
  return Buffer.from(await res.arrayBuffer());
}
