import { clienteAuth, Prisma } from "@opai/db";

import { MFA_BLOQUEO_SEGUNDOS, MFA_LIMITE_INTENTOS } from "./opciones";

/**
 * Bloqueo por cuenta del segundo factor CUANDO YA HAY SESIÓN (enrolamiento o Google con MFA
 * pendiente, #68): en better-auth 1.7.12 el `accountLockout` del plugin `twoFactor` (y el tope de
 * intentos por desafío) solo corren en el login sin sesión (`isSignIn` dentro de `verifyTwoFactor`);
 * con sesión, `verifyTOTP`/`verifyBackupCode` no cuentan fallos ni bloquean. Esto reutiliza las
 * mismas columnas del plugin (`failedVerificationCount`, `lockedUntil`) y el mismo tope
 * (`MFA_LIMITE_INTENTOS`/`MFA_BLOQUEO_SEGUNDOS`) para esa sesión, sin migración nueva ni tocar el
 * plugin. Lo engancha un `before`/`after` hook de `marcaMfaSesion` (`mfa-sesion.ts`) sobre
 * `/two-factor/verify-totp` y `/two-factor/verify-backup-code` (Revisor, PR #65, review 5662691274):
 * así cubre la Server Action y el POST directo por igual, no solo quien pasa por `mfa.ts`.
 */
export type ReservaMfaSesion = "sin-enrolar" | "bloqueada" | "reservada";

/**
 * Reserva un intento de verificación ANTES de comprobar el código: incrementa el contador y, si
 * llega al tope, fija el bloqueo en el mismo UPDATE con retorno de Prisma. El WHERE compara el
 * contador y bloqueo leídos; si otra petición los cambió, reintenta sin verificar el código.
 * Así no hay TOCTOU: como mucho `MFA_LIMITE_INTENTOS` reservas por cuenta
 * quedan en `reservada` antes de que las siguientes vean `bloqueada`, sin importar cuántas lleguen
 * a la vez. Un bloqueo ya vencido se trata como contador en cero (igual que `assertTwoFactorNotLocked`
 * del plugin), para que no arrastre los fallos de antes del vencimiento.
 */
export async function reservarIntentoMfaConSesion(userId: string): Promise<ReservaMfaSesion> {
  const db = clienteAuth();
  for (;;) {
    const cuenta = await db.twoFactor.findUnique({
      where: { userId },
      select: { id: true, failedVerificationCount: true, lockedUntil: true },
    });
    if (!cuenta) return "sin-enrolar";
    const ahora = Date.now();
    if (cuenta.lockedUntil && cuenta.lockedUntil.getTime() > ahora) return "bloqueada";
    const expirado = cuenta.lockedUntil !== null;
    const siguiente = (expirado ? 0 : cuenta.failedVerificationCount) + 1;
    const bloquear = siguiente >= MFA_LIMITE_INTENTOS;
    try {
      await db.twoFactor.update({
        where: {
          id: cuenta.id,
          userId,
          failedVerificationCount: cuenta.failedVerificationCount,
          lockedUntil: cuenta.lockedUntil,
        },
        data: {
          failedVerificationCount: siguiente,
          lockedUntil: bloquear ? new Date(ahora + MFA_BLOQUEO_SEGUNDOS * 1000) : null,
        },
        select: { id: true },
      });
      return "reservada";
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2025")
        throw error;
    }
  }
}

/** Limpia el contador de la cuenta tras un código correcto. Best-effort: no rompe el flujo de login. */
export async function limpiarFallosMfaConSesion(userId: string): Promise<void> {
  try {
    await clienteAuth().twoFactor.updateMany({
      where: { userId },
      data: { failedVerificationCount: 0, lockedUntil: null },
    });
  } catch {
    console.warn("[mfa] no se pudo limpiar el contador del segundo factor con sesión");
  }
}
