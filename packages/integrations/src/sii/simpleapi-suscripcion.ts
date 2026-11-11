// Prueba real de la API key de SimpleAPI DTE (CAR-263, CAR-263b): `GET /api/v1/Suscripcion/status`, publicado en su
// Swagger (https://api.simpleapi.cl/swagger). No emite, no usa folios y no envía el certificado ni el CAF.
//
// Por qué existe: SimpleAPI responde 401 con cuerpo vacío y encabezados `x-rate-limit-*` a CUALQUIER petición que no
// autentica (sin `Authorization` o con una key inventada; verificado el 10-nov-2026). Esos encabezados no prueban que
// la key sea válida, así que un 401 de `dte/generar` no dice si falla la key o el contenido. Esta llamada sí lo dice.
//
// Dos esquemas (CAR-263b): la emisión, OPAI 1.0 y el SDK oficial usan `Basic base64("api:" + key)`; la documentación
// pública de SimpleAPI muestra la key cruda en `Authorization`. Un 401 con Basic en este endpoint no basta para culpar a
// la key: puede que solo acepte la forma cruda. Por eso se prueban los dos y la key solo es «no reconocida» si ambos
// responden 401/403. El largo de la key no se valida: el `1111-1111-1111-1111` de la documentación es un ejemplo.

import { detalleSeguroDeRespuesta } from "./error-proveedor";
import { encabezadoAuthSimpleApi, limpiarKeySimpleApi, SIMPLEAPI_BASE } from "./simpleapi-contrato";

export const SIMPLEAPI_RUTA_SUSCRIPCION = `${SIMPLEAPI_BASE}/api/v1/Suscripcion/status` as const;

/** Forma del header `Authorization` que aceptó SimpleAPI (nunca su valor): `Basic api:key` o la key cruda. */
export type EsquemaAuthSimpleApi = "basic" | "raw";

export type ResultadoKeySimpleApi =
  /** SimpleAPI aceptó la key (HTTP 2xx) con `esquema`. `detalle`: texto externo corto y saneado, si lo hay. */
  | { estado: "reconocida"; status: number; esquema: EsquemaAuthSimpleApi; detalle: string | null }
  /** HTTP 401 o 403 con los dos esquemas: la key no se reconoce, venció o no tiene suscripción a este servicio. */
  | { estado: "no_reconocida"; status: number; detalle: string | null }
  /** Otro estado (5xx, 404, 429) o sin conexión: no dice nada de la key. */
  | { estado: "sin_respuesta"; status: number; detalle: string | null };

/**
 * Pistas de forma de la key tal como se envía (ya sin espacios ni caracteres invisibles), sin revelarla: si queda un
 * carácter que no es letra, número ni guion (comillas, un punto), se coló al pegarla y SimpleAPI la rechaza. El largo
 * es solo una pista para comparar con el panel de SimpleAPI; no hay un largo correcto.
 */
export function formaDeKeySimpleApi(apiKey: string): { largo: number; caracteresExtranos: boolean } {
  const k = limpiarKeySimpleApi(apiKey);
  return { largo: k.length, caracteresExtranos: !/^[A-Za-z0-9-]+$/.test(k) };
}

const ENCABEZADO: Record<EsquemaAuthSimpleApi, (apiKey: string) => string> = {
  basic: encabezadoAuthSimpleApi,
  raw: limpiarKeySimpleApi,
};

async function consultar(apiKey: string, esquema: EsquemaAuthSimpleApi): Promise<ResultadoKeySimpleApi> {
  let res: Response;
  try {
    res = await fetch(SIMPLEAPI_RUTA_SUSCRIPCION, {
      method: "GET",
      headers: { Authorization: ENCABEZADO[esquema](apiKey), Accept: "application/json, text/plain" },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    // Sin conexión o sin respuesta en 15 s: no dice nada de la key.
    return { estado: "sin_respuesta", status: 0, detalle: null };
  }
  const detalle = detalleSeguroDeRespuesta(await res.text().catch(() => ""), [apiKey, limpiarKeySimpleApi(apiKey)]);
  if (res.ok) return { estado: "reconocida", status: res.status, esquema, detalle };
  if (res.status === 401 || res.status === 403) return { estado: "no_reconocida", status: res.status, detalle };
  return { estado: "sin_respuesta", status: res.status, detalle };
}

/**
 * Pregunta a SimpleAPI por la suscripción de la key: primero con `Basic api:key` (el de la emisión) y, si responde 401
 * o 403, con la key cruda (el de la documentación pública). Nunca registra ni devuelve la key ni el header.
 */
export async function probarKeySimpleApi(apiKey: string): Promise<ResultadoKeySimpleApi> {
  const basic = await consultar(apiKey, "basic");
  if (basic.estado !== "no_reconocida") return basic;
  return consultar(apiKey, "raw");
}
