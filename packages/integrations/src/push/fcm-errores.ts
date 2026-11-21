/** Códigos en `error.details[].errorCode` que indican token FCM/APNs inválido o dado de baja (HTTP v1). */
const CODIGOS_TOKEN_MUERTO = new Set(["UNREGISTERED", "INVALID_REGISTRATION", "NOT_REGISTERED"]);

type ErrorFcm = { status?: string; details?: { errorCode?: string }[] };

/** Marca vencida solo por códigos de registro en `details`; no usa `INVALID_ARGUMENT` genérico ni 404. */
export function tokenFcmVencido(error: ErrorFcm | undefined): boolean {
  if (!error) return false;
  for (const d of error.details ?? []) {
    if (d.errorCode && CODIGOS_TOKEN_MUERTO.has(d.errorCode)) return true;
  }
  return error.status === "UNREGISTERED";
}