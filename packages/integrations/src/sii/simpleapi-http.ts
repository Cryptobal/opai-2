import {
  detalleSeguroDeRespuesta,
  ErrorProveedorSii,
  formaDeCuerpo,
  limitesDeRespuesta,
  type FormaCuerpo,
  type PasoProveedorSii,
} from "./error-proveedor";
import { encabezadoAuthSimpleApi } from "./simpleapi-contrato";
import { diagnosticoRespuestaSii } from "./simpleapi-diagnostico";
import { cuerpoMultipart, type ParteMultipart } from "./simpleapi-multipart";
import { esRechazoMudo, tokenSimpleApi } from "./simpleapi-token";
import { bytesDeXml } from "./xml-iso";

export type { ParteMultipart } from "./simpleapi-multipart";

/** Una parte de archivo del multipart (sus bytes quedan a mano para el diagnóstico de un rechazo). */
export type ArchivoMultipart = Extract<ParteMultipart, { bytes: Uint8Array }>;

/**
 * POST multipart con Basic api:key en `Authorization` y el cuerpo armado como en OPAI 1.0 (CAR-240). Si SimpleAPI lo
 * rechaza sin decir nada (401 o 403 sin cuerpo), se repite una vez con `Bearer <token>`: por esa vía acepta la petición
 * o responde con el motivo en texto. El rechazo mudo ocurre antes de procesar nada, así que repetir no duplica un envío.
 * La llamada nunca corre dentro de una transacción de base.
 */
export async function postMultipartSimpleApi(
  url: string,
  apiKey: string,
  partes: readonly ParteMultipart[],
): Promise<Response> {
  const { cuerpo, contentType } = cuerpoMultipart(partes);
  const enviar = (authorization: string) =>
    fetch(url, {
      method: "POST",
      headers: { Authorization: authorization, "Content-Type": contentType, Accept: "application/json, text/xml, text/plain" },
      body: new Uint8Array(cuerpo),
    });
  const res = await enviar(encabezadoAuthSimpleApi(apiKey));
  if (!(await esRechazoMudo(res))) return res;
  const token = await tokenSimpleApi(apiKey);
  return token ? enviar(`Bearer ${token}`) : res;
}

/** El certificado .pfx como archivo `file` (sus bytes, desde el base64 guardado). */
export function archivoPfx(base64: string): ArchivoMultipart {
  return { nombre: "file", bytes: Buffer.from(base64, "base64"), tipo: "application/x-pkcs12", nombreArchivo: "certificado.pfx" };
}

/**
 * Un XML (CAF, DTE o sobre) como archivo `file`, en los mismos bytes ISO-8859-1 que se recibieron (ADR-075), nunca
 * transcodificado a UTF-8: la firma del CAF y del DTE cubre esos bytes.
 */
export function archivoXml(xmlLatin1: string, nombreArchivo: string): ArchivoMultipart {
  return { nombre: "file", bytes: bytesDeXml(xmlLatin1), tipo: "application/xml", nombreArchivo };
}

/**
 * Motivo de un HTTP no 2xx (CAR-263). Los headers `x-rate-limit-*` NO prueban que la key autenticó: SimpleAPI los envía
 * en todas sus respuestas, también sin `Authorization` o con una key inventada (verificado contra api.simpleapi.cl el
 * 10-nov-2026; la regla contraria venía de `isApiKeyAuthenticated` de 1.0 y dio por buena una key sin comprobarla).
 * Un 401 o 403 sin cuerpo no dice si falla la key o el contenido; `postMultipartSimpleApi` ya lo repitió con token.
 */
function motivoHttp(status: number, cuerpo: FormaCuerpo): string {
  if (status !== 401 && status !== 403) return `respondió HTTP ${status}`;
  // La documentación de SimpleAPI: un 401 también es «falta de suscripción válida o token expirado» para esa API.
  if (cuerpo === "suscripcion") {
    return `indicó que la API key no tiene suscripción vigente para este servicio o que venció, HTTP ${status}`;
  }
  if (cuerpo === "vacio") {
    return `respondió HTTP ${status} sin motivo, también al repetir con token; usa «Probar conexión» en Integraciones › Emisión DTE para ver qué responde a la API key`;
  }
  // Con texto del proveedor, el detalle saneado acompaña al estado; no se adivina la causa.
  return `rechazó la petición, HTTP ${status}`;
}

/**
 * Error tipado de una respuesta no 2xx (CAR-242): el estado HTTP y, si lo hay, un detalle corto y saneado del
 * mensaje del proveedor. Nunca el cuerpo completo (puede traer datos del documento) ni secretos.
 */
async function errorHttp(res: Response, paso: PasoProveedorSii, secretos: readonly string[]): Promise<ErrorProveedorSii> {
  const cuerpo = await res.text().catch(() => "");
  const detalle = detalleSeguroDeRespuesta(cuerpo, secretos);
  const limites = limitesDeRespuesta(res.headers);
  const forma = formaDeCuerpo(cuerpo);
  // Un 5xx del envío no prueba que el SII no lo haya recibido.
  const error = new ErrorProveedorSii(paso, motivoHttp(res.status, forma), res.status, detalle, paso === "enviar" && res.status >= 500);
  error.limites = limites;
  error.cuerpo = forma;
  error.respuesta = diagnosticoRespuestaSii(res.headers, cuerpo, detalle);
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
