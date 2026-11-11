// Prueba real de la API key de SimpleAPI DTE (CAR-263): `GET /api/v1/Suscripcion/status`, publicado en su Swagger
// (https://api.simpleapi.cl/swagger). No emite, no usa folios y no envía el certificado ni el CAF.
//
// Por qué existe: SimpleAPI responde 401 con cuerpo vacío y encabezados `x-rate-limit-*` a CUALQUIER petición que no
// autentica (sin `Authorization` o con una key inventada; verificado el 10-nov-2026). Esos encabezados no prueban que
// la key sea válida, así que un 401 de `dte/generar` no dice si falla la key o el contenido. Esta llamada sí lo dice.

import { detalleSeguroDeRespuesta } from "./error-proveedor";
import { encabezadoAuthSimpleApi, SIMPLEAPI_BASE } from "./simpleapi-contrato";

export const SIMPLEAPI_RUTA_SUSCRIPCION = `${SIMPLEAPI_BASE}/api/v1/Suscripcion/status` as const;

export type ResultadoKeySimpleApi =
  /** SimpleAPI aceptó la key (HTTP 2xx). `detalle`: texto externo corto y saneado de su respuesta, si lo hay. */
  | { estado: "reconocida"; status: number; detalle: string | null }
  /** HTTP 401 o 403: la respuesta de SimpleAPI a una key que no reconoce, vencida o sin suscripción a este servicio. */
  | { estado: "no_reconocida"; status: number; detalle: string | null }
  /** Otro estado (5xx, 404, 429): no dice nada de la key. */
  | { estado: "sin_respuesta"; status: number; detalle: string | null };

/**
 * Pistas de forma de la key, sin revelarla: un carácter que no es letra, número ni guion suele ser un espacio, un salto
 * o un carácter invisible que se coló al pegarla, y SimpleAPI la rechaza igual que a una key inválida.
 */
export function formaDeKeySimpleApi(apiKey: string): { largo: number; caracteresExtranos: boolean } {
  const k = apiKey.trim();
  return { largo: k.length, caracteresExtranos: !/^[A-Za-z0-9-]+$/.test(k) };
}

/** Pregunta a SimpleAPI por la suscripción de la key. Nunca registra ni devuelve la key. */
export async function probarKeySimpleApi(apiKey: string): Promise<ResultadoKeySimpleApi> {
  const res = await fetch(SIMPLEAPI_RUTA_SUSCRIPCION, {
    method: "GET",
    headers: { Authorization: encabezadoAuthSimpleApi(apiKey), Accept: "application/json, text/plain" },
  });
  const detalle = detalleSeguroDeRespuesta(await res.text().catch(() => ""), [apiKey, apiKey.trim()]);
  if (res.ok) return { estado: "reconocida", status: res.status, detalle };
  if (res.status === 401 || res.status === 403) return { estado: "no_reconocida", status: res.status, detalle };
  return { estado: "sin_respuesta", status: res.status, detalle };
}
