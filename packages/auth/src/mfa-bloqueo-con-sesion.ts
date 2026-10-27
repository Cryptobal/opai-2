import { clienteAuth } from "@opai/db";

import { auth } from "./auth";
import { MFA_BLOQUEO_SEGUNDOS, MFA_LIMITE_INTENTOS } from "./opciones";

/**
 * Bloqueo por cuenta del segundo factor CUANDO YA HAY SESIÓN (Google u otro proveedor social con MFA
 * pendiente, #68): en better-auth 1.7.12 el `accountLockout` del plugin `twoFactor` (y el tope de
 * intentos por desafío) solo corren en el login sin sesión (`isSignIn` dentro de `verifyTwoFactor`);
 * con sesión, `verifyTOTP`/`verifyBackupCode` no cuentan fallos ni bloquean (Revisor, PR #65, review
 * 5662337649). Esto reutiliza las mismas columnas del plugin (`failedVerificationCount`,
 * `lockedUntil`) y el mismo tope (`MFA_LIMITE_INTENTOS`/`MFA_BLOQUEO_SEGUNDOS`) para esa sesión, sin
 * migración nueva ni tocar el plugin.
 */
type CuentaMfa = { id: string; lockedUntil: Date | null };

/** La cuenta del segundo factor, solo si YA hay una sesión (no el desafío de login sin sesión). */
export async function cuentaMfaConSesion(headersReq: Headers): Promise<CuentaMfa | null> {
  const s = await auth.api.getSession({ headers: headersReq });
  if (!s?.session) return null;
  return clienteAuth().twoFactor.findUnique({
    where: { userId: s.user.id },
    select: { id: true, lockedUntil: true },
  });
}

export function cuentaBloqueada(cuenta: CuentaMfa): boolean {
  return !!cuenta.lockedUntil && cuenta.lockedUntil.getTime() > Date.now();
}

/** Cuenta un fallo y bloquea la cuenta si llega al tope. Best-effort: no rompe el flujo de login. */
export async function registrarFalloDeCuenta(id: string): Promise<void> {
  try {
    const r = await clienteAuth().twoFactor.update({
      where: { id },
      data: { failedVerificationCount: { increment: 1 } },
      select: { failedVerificationCount: true },
    });
    if (r.failedVerificationCount >= MFA_LIMITE_INTENTOS) {
      await clienteAuth().twoFactor.updateMany({
        where: { id, failedVerificationCount: { gte: MFA_LIMITE_INTENTOS } },
        data: { lockedUntil: new Date(Date.now() + MFA_BLOQUEO_SEGUNDOS * 1000) },
      });
    }
  } catch {
    console.warn("[mfa] no se pudo registrar el fallo del segundo factor con sesión");
  }
}

/** Limpia el contador tras un código correcto. Best-effort: no rompe el flujo de login. */
export async function limpiarFallosDeCuenta(id: string): Promise<void> {
  try {
    await clienteAuth().twoFactor.update({
      where: { id },
      data: { failedVerificationCount: 0, lockedUntil: null },
    });
  } catch {
    console.warn("[mfa] no se pudo limpiar el contador del segundo factor con sesión");
  }
}
