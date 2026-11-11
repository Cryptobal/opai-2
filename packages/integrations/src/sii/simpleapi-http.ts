import {
  detalleSeguroDeRespuesta,
  ErrorProveedorSii,
  formaDeCuerpo,
  limitesDeRespuesta,
  type FormaCuerpo,
  type PasoProveedorSii,
} from "./error-proveedor";
import { encabezadoAuthSimpleApi } from "./simpleapi-contrato";
import { cuerpoMultipart, type ParteMultipart } from "./simpleapi-multipart";
import { bytesDeXml } from "./xml-iso";

export type { ParteMultipart } from "./simpleapi-multipart";

/**
 * POST multipart con Basic api:key en `Authorization` y el cuerpo armado como en OPAI 1.0 (CAR-240). La llamada nunca
 * corre dentro de una transacción de base.
 */
export async function postMultipartSimpleApi(
  url: string,
  apiKey: string,
  partes: readonly ParteMultipart[],
): Promise<Response> {
  const { cuerpo, contentType } = cuerpoMultipart(partes);
  return fetch(url, {
    method: "POST",
    headers: {
      Authorization: encabezadoAuthSimpleApi(apiKey),
      "Content-Type": contentType,
      Accept: "application/json, text/xml, text/plain",
    },
    body: new Uint8Array(cuerpo),
  });
}

/** El certificado .pfx como archivo `file` (sus bytes, desde el base64 guardado). */
export function archivoPfx(base64: string): ParteMultipart {
  return { nombre: "file", bytes: Buffer.from(base64, "base64"), tipo: "application/x-pkcs12", nombreArchivo: "certificado.pfx" };
}

/**
 * Un XML (CAF, DTE o sobre) como archivo `file`, en los mismos bytes ISO-8859-1 que se recibieron (ADR-075), nunca
 * transcodificado a UTF-8: la firma del CAF y del DTE cubre esos bytes.
 */
export function archivoXml(xmlLatin1: string, nombreArchivo: string): ParteMultipart {
  return { nombre: "file", bytes: bytesDeXml(xmlLatin1), tipo: "application/xml", nombreArchivo };
}

/**
 * Motivo de un HTTP no 2xx (CAR-240, como `describeSimpleApiError` de 1.0): SimpleAPI usa 401 tanto para una key no
 * reconocida como para un contenido rechazado. Solo cuando reconoce la key envía los headers `x-rate-limit-*`; con
 * ellos, el 401 es del contenido (certificado, CAF o datos), no de la key.
 */
function motivoHttp(status: number, headers: Headers, cuerpo: FormaCuerpo): string {
  // Se miran los nombres crudos: un valor que no pasa el saneo de `limitesDeRespuesta` igual prueba que la key autenticó.
  let keyReconocida = false;
  headers.forEach((_v, h) => {
    if (/^x-rate-?limit-/i.test(h)) keyReconocida = true;
  });
  // La documentación de SimpleAPI: un 401 también es «falta de suscripción válida o token expirado» para esa API.
  if ((status === 401 || status === 403) && cuerpo === "suscripcion") {
    return `indicó que la API key no tiene suscripción vigente para este servicio o que venció, HTTP ${status}`;
  }
  // 401 vacío con la key reconocida (CAR-240): SimpleAPI no dice qué rechazó; la key no es el problema.
  if (status === 401 && keyReconocida && cuerpo === "vacio") {
    return "aceptó la API key pero rechazó el contenido sin decir el motivo (certificado, CAF o un dato del DTE; si el preflight marca el CAF dañado, vuelva a cargarlo), HTTP 401";
  }
  if ((status === 401 || status === 400 || status === 422) && keyReconocida) {
    return `rechazó el contenido (certificado, CAF o datos), HTTP ${status}`;
  }
  if ((status === 401 || status === 403) && !keyReconocida) return `no reconoció la API key, HTTP ${status}`;
  return `respondió HTTP ${status}`;
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
  const error = new ErrorProveedorSii(paso, motivoHttp(res.status, res.headers, forma), res.status, detalle, paso === "enviar" && res.status >= 500);
  error.limites = limites;
  error.cuerpo = forma;
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
