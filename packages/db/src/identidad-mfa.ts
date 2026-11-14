import { conRolAuth } from "./identidad";
import { notificarConsulta } from "./metricas";
import type { TenantTx } from "./transaccion";

// Restablecimiento del segundo factor (CAR-54), separado de `identidad.ts` por tamaño.

/**
 * Restablece el segundo factor de un usuario (CAR-54): borra su enrolamiento y cierra todas sus
 * sesiones, para que vuelva a entrar con contraseña y enrolarse de nuevo. Corre en la transacción
 * de la capacidad que lo autorizó, junto con su auditoría.
 *
 * Antes de tocar nada bloquea la fila de `core.users` (`FOR UPDATE`) y, si se pasa `reverificar`,
 * le entrega su estado recién leído (bajo el lock) para que el llamador repita ahí sus condiciones
 * de autorización: entre la comprobación inicial (fuera de la transacción) y este punto, el rol de
 * plataforma o el estado del MFA pudieron cambiar (CAR-54, carrera de la auditoría del Núcleo §I-15).
 * `reverificar` lanza para abortar; la fila sigue bloqueada hasta el COMMIT o el ROLLBACK.
 */
export async function restablecerSegundoFactor(
  tx: TenantTx,
  userId: string,
  reverificar?: (u: {
    platformRole: string | null;
    twoFactorEnabled: boolean;
    passkeyEnabled: boolean;
  }) => void,
) {
  return conRolAuth(tx, async () => {
    const [u] = await tx.$queryRaw<
      { platformRole: string | null; twoFactorEnabled: boolean; passkeyEnabled: boolean }[]
    >`
      SELECT platform_role AS "platformRole", two_factor_enabled AS "twoFactorEnabled",
        passkey_enabled AS "passkeyEnabled"
      FROM core.users WHERE id = ${userId}::uuid FOR UPDATE`;
    if (!u) throw new Error("No se pudo bloquear el usuario.");
    reverificar?.(u);
    const enrolamientos = await tx.$executeRaw`
      DELETE FROM core.two_factor WHERE user_id = ${userId}::uuid`;
    // Las passkeys pueden vivir en el teléfono perdido (CAR-286): también se borran; el trigger
    // de core.passkeys deja `passkey_enabled` en false.
    const passkeys =
      await tx.$executeRaw`DELETE FROM core.passkeys WHERE user_id = ${userId}::uuid`;
    await tx.$executeRaw`
      UPDATE core.users SET two_factor_enabled = false, updated_at = now() WHERE id = ${userId}::uuid`;
    const sesiones =
      await tx.$executeRaw`DELETE FROM core.sessions WHERE user_id = ${userId}::uuid`;
    return { enrolamientos, passkeys, sesiones };
  });
}

/**
 * Bloquea la fila de membresía (`FOR UPDATE`) en la transacción de la escritura y devuelve a qué
 * tenant y usuario sigue perteneciendo (CAR-54, carrera de la auditoría del Núcleo §I-15): entre la
 * comprobación inicial y el restablecimiento, la membresía pudo moverse o borrarse. `null` si ya no
 * existe; la RLS de la transacción ya acota la fila al tenant actual, así que tampoco aparece una
 * ajena. El llamador compara el resultado contra lo que autorizó antes de seguir.
 */
export async function membresiaBloqueada(
  tx: TenantTx,
  membershipId: string,
): Promise<{ tenantId: string; userId: string } | null> {
  notificarConsulta();
  const [m] = await tx.$queryRaw<{ tenantId: string; userId: string }[]>`
    SELECT tenant_id AS "tenantId", user_id AS "userId"
    FROM core.memberships WHERE id = ${membershipId}::uuid FOR UPDATE`;
  return m ?? null;
}
