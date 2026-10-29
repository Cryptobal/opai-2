import { hashIp, registrarSeguridad } from "@opai/db";

/**
 * Registro de seguridad global (CAR-42, auditoría del Núcleo I-03): login, contraseña y MFA quedan
 * en `core.auditoria_global` (ámbito `seguridad`, preparado por CAR-36/CAR-41), append-only y sin
 * tenant, con la IP en HMAC (nunca en claro) y el user agent. Best-effort: un fallo al auditar no
 * debe romper el acceso ni la acción (mismo criterio que `bloqueo-login.ts`).
 */

/** IP (del primer salto de `x-forwarded-for`, o `x-real-ip`) y user agent de la petición. */
function datosPeticion(h: Headers): { ipCifrada: string | null; userAgent: string | null } {
  const reenviada = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = reenviada || h.get("x-real-ip") || null;
  return { ipCifrada: ip ? hashIp(ip) : null, userAgent: h.get("user-agent") || null };
}

/** Registra un hecho de seguridad. Nunca lanza: un fallo queda solo en el log del servidor. */
export async function auditarSeguridad(
  capability: string,
  actorId: string | null,
  h: Headers,
  entityId?: string | null,
  payload?: unknown,
): Promise<void> {
  try {
    const { ipCifrada, userAgent } = datosPeticion(h);
    await registrarSeguridad({
      capability,
      actorId,
      ...(entityId !== undefined ? { entityId } : {}),
      ...(payload !== undefined ? { payload } : {}),
      ipCifrada,
      userAgent,
    });
  } catch (error) {
    console.warn(`[seguridad] no se pudo registrar "${capability}"`, {
      error: error instanceof Error ? error.name : typeof error,
    });
  }
}
