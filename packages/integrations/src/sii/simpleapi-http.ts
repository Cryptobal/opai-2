import { detalleSeguroDeRespuesta, ErrorProveedorSii, limitesDeRespuesta, type PasoProveedorSii } from "./error-proveedor";
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

/**
 * Error tipado de una respuesta no 2xx (CAR-242): el estado HTTP y, si lo hay, un detalle corto y saneado del
 * mensaje del proveedor. Nunca el cuerpo completo (puede traer datos del documento) ni secretos.
 */
async function errorHttp(res: Response, paso: PasoProveedorSii, secretos: readonly string[]): Promise<ErrorProveedorSii> {
  const cuerpo = await res.text().catch(() => "");
  const detalle = detalleSeguroDeRespuesta(cuerpo, secretos);
  // Un 5xx del envío no prueba que el SII no lo haya recibido.
  const error = new ErrorProveedorSii(paso, `respondió HTTP ${res.status}`, res.status, detalle, paso === "enviar" && res.status >= 500);
  error.limites = limitesDeRespuesta(res.headers);
  return error;
}

/** `secretos`: valores propios (API key, clave del certificado) que nunca pueden salir en el detalle. */
export async function leerJsonRespuesta<T>(res: Response, paso: PasoProveedorSii, secretos: readonly string[] = []): Promise<T> {
  if (!res.ok) throw await errorHttp(res, paso, secretos);
  try {
    return (await res.json()) as T;
  } catch {
    throw new ErrorProveedorSii(paso, "la respuesta no es un JSON válido", res.status, null, paso === "enviar");
  }
}

/** Respuesta XML como bytes (ISO-8859-1): nunca pasa por `res.text()`, que decodificaría como UTF-8. */
export async function leerBytesRespuesta(res: Response, paso: PasoProveedorSii, secretos: readonly string[] = []): Promise<Buffer> {
  if (!res.ok) throw await errorHttp(res, paso, secretos);
  return Buffer.from(await res.arrayBuffer());
}
