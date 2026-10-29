import { agregarAAuditoriaGlobal } from "./auditoria-global";
import type { TenantTx } from "./transaccion";

/**
 * Hecho de seguridad (CAR-42, auditoría del Núcleo I-03): login, contraseña o MFA. Va al ámbito
 * `seguridad` de `core.auditoria_global` (preparado por CAR-36/CAR-41), global y append-only, con
 * la IP en HMAC (nunca en claro) y el user agent. `actorId` es `null` cuando el intento falló antes
 * de identificar una cuenta (nunca se busca el correo: sería un oráculo de qué cuentas existen).
 */
export type HechoSeguridad = {
  /** "seguridad.login", "seguridad.password_cambio", "seguridad.mfa_desactivar", etc. */
  capability: string;
  actorId: string | null;
  /** Usuario afectado, si es distinto del actor (p. ej. un owner restablece el MFA de otro). */
  entityId?: string | null;
  payload?: unknown;
  ipCifrada: string | null;
  userAgent: string | null;
};

/** Append a la cadena `seguridad` de la auditoría global. Acepta `tx` para ser atómico con la
 * escritura que audita (mismo patrón que `auditarPlataforma`, ADR-052). */
export async function registrarSeguridad(hecho: HechoSeguridad, tx?: TenantTx) {
  return agregarAAuditoriaGlobal(
    "seguridad",
    {
      actorTipo: "user",
      actorId: hecho.actorId,
      viaUserId: null,
      capability: hecho.capability,
      tenantObjetivoId: null,
      origenTenantId: null,
      entityType: "user",
      entityId: hecho.entityId ?? hecho.actorId,
      payload: hecho.payload ?? null,
      ipCifrada: hecho.ipCifrada,
      userAgent: hecho.userAgent,
    },
    tx,
  );
}
