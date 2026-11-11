// Medición de la API key de SimpleAPI DTE contra `GET /api/v1/Suscripcion/status` (Swagger de SimpleAPI), por las dos
// vías de autenticación (CAR-263, CAR-240). No emite, no usa folios y no envía el certificado ni el CAF.
//
// Verificado contra api.simpleapi.cl el 10-nov-2026 con una key inventada: con `Basic api:key` responde 401 sin cuerpo;
// con `Bearer <token>` responde 200 y la lista de suscripciones de la key, vacía (`[]`) para una key que no conoce.
// Lo que responde a una key válida no se ha podido observar desde fuera: por eso se informa lo medido, sin adivinar.

import { encabezadoAuthSimpleApi, limpiarKeySimpleApi, SIMPLEAPI_BASE } from "./simpleapi-contrato";
import { tokenSimpleApi } from "./simpleapi-token";

export const SIMPLEAPI_RUTA_SUSCRIPCION = `${SIMPLEAPI_BASE}/api/v1/Suscripcion/status` as const;

export type MedicionKeySimpleApi = {
  /** Estado HTTP con `Basic api:key`; 0 si no hubo respuesta. */
  basic: number;
  /** Estado HTTP con `Bearer <token>`; null si SimpleAPI no entregó token; 0 si no hubo respuesta. */
  bearer: number | null;
  /** Cuántas suscripciones informó para la key (largo de la lista); null si no vino una lista. Nunca su contenido. */
  suscripciones: number | null;
};

/** Pistas de forma de la key tal como se envía (sin espacios ni invisibles), sin revelarla. */
export function formaDeKeySimpleApi(apiKey: string): { largo: number; caracteresExtranos: boolean } {
  const k = limpiarKeySimpleApi(apiKey);
  return { largo: k.length, caracteresExtranos: !/^[A-Za-z0-9-]+$/.test(k) };
}

async function consultar(authorization: string): Promise<{ status: number; lista: number | null }> {
  try {
    const res = await fetch(SIMPLEAPI_RUTA_SUSCRIPCION, {
      method: "GET",
      headers: { Authorization: authorization, Accept: "application/json, text/plain" },
      signal: AbortSignal.timeout(15_000),
    });
    const json: unknown = res.ok ? await res.json().catch(() => null) : null;
    return { status: res.status, lista: Array.isArray(json) ? json.length : null };
  } catch {
    return { status: 0, lista: null };
  }
}

/** Mide qué responde SimpleAPI a la key guardada. Nunca registra ni devuelve la key, el token ni la lista. */
export async function medirKeySimpleApi(apiKey: string): Promise<MedicionKeySimpleApi> {
  const basic = await consultar(encabezadoAuthSimpleApi(apiKey));
  const token = await tokenSimpleApi(apiKey);
  const bearer = token ? await consultar(`Bearer ${token}`) : null;
  return { basic: basic.status, bearer: bearer?.status ?? null, suscripciones: basic.lista ?? bearer?.lista ?? null };
}
