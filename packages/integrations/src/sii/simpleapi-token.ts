// Token Bearer de SimpleAPI (CAR-240): `POST /api/Auth/token` con `{ apikey }` devuelve un JWT (Swagger de SimpleAPI).
//
// Por qué existe (verificado contra api.simpleapi.cl el 10-nov-2026, con una key inventada): con `Basic api:key`,
// SimpleAPI responde 401 sin cuerpo y no dice por qué. Con `Authorization: Bearer <token>` responde con el motivo en
// texto («RUT de emisor incorrecto», «API KEY Incorrecta. No es posible continuar») y `Suscripcion/status` devuelve
// la lista de suscripciones de la key. El token lleva la key dentro: es un secreto y nunca se registra ni se devuelve.

import { limpiarKeySimpleApi, SIMPLEAPI_BASE } from "./simpleapi-contrato";

export const SIMPLEAPI_RUTA_TOKEN = `${SIMPLEAPI_BASE}/api/Auth/token` as const;

const JWT = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

/** Pide el token; null si SimpleAPI no lo entrega o no hay conexión (quien llama sigue sin él). */
export async function tokenSimpleApi(apiKey: string): Promise<string | null> {
  try {
    const res = await fetch(SIMPLEAPI_RUTA_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/plain, application/json" },
      body: JSON.stringify({ apikey: limpiarKeySimpleApi(apiKey) }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const token = (await res.text()).trim().replace(/^"|"$/g, "");
    return JWT.test(token) ? token : null;
  } catch {
    return null;
  }
}

/** ¿Es el rechazo mudo de SimpleAPI (401 o 403 sin cuerpo)? Lee una copia; la respuesta original queda intacta. */
export async function esRechazoMudo(res: Response): Promise<boolean> {
  if (res.status !== 401 && res.status !== 403) return false;
  return (await res.clone().text().catch(() => "")).trim() === "";
}
