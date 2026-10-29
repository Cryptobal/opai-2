import { agregarAAuditoriaGlobal } from "./auditoria-global";
import type { TenantTx } from "./transaccion";

/**
 * Rastro de seguridad de la identidad (CAR-42, auditoría del Núcleo §I-03): login, cierre de sesión,
 * contraseña y segundo factor, en la cadena `seguridad` de `core.auditoria_global` (append-only para
 * `opai_app`, encadenada con hash, sin tenant). Nunca la IP en claro: solo su HMAC (`ipHmac`).
 */
export type EventoSeguridad = {
  /** `seguridad.<hecho>`: `seguridad.login.ok`, `seguridad.password.cambio`, `seguridad.mfa.…`. */
  tipo: `seguridad.${string}`;
  /** Usuario al que se refiere el hecho; null si no se pudo resolver (correo inexistente). */
  userId: string | null;
  /** Quien lo hizo, si no es el propio usuario (restablecer MFA de otro: el owner o Plataforma). */
  porUserId?: string | null;
  /** Empresa desde la que se hizo, si la hay (restablecer MFA por el owner de una empresa). */
  tenantId?: string | null;
  /** Resultado y detalle sin datos personales (`{ resultado: "fallido", motivo: "credenciales" }`). */
  detalle?: Record<string, string | number | boolean | null>;
  ipHmac: string | null;
  userAgent: string | null;
};

/**
 * Agrega el hecho a la cadena `seguridad`: en la transacción del llamador si la hay (restablecer el
 * MFA de otro, atómico con su escritura), o en una propia (hooks de Better Auth).
 */
export async function registrarEventoSeguridad(e: EventoSeguridad, tx?: TenantTx): Promise<void> {
  const hecho = {
    actorTipo: e.porUserId ? "user" : "self",
    actorId: e.porUserId ?? e.userId,
    viaUserId: null,
    capability: e.tipo,
    tenantObjetivoId: e.tenantId ?? null,
    origenTenantId: e.tenantId ?? null,
    entityType: e.userId ? "user" : null,
    entityId: e.userId,
    payload: e.detalle ?? null,
    ipCifrada: e.ipHmac,
    userAgent: e.userAgent ? e.userAgent.slice(0, 300) : null,
  };
  await agregarAAuditoriaGlobal("seguridad", hecho, tx);
}
