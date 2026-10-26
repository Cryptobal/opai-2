import { headers } from "next/headers";

import { APIError } from "better-auth/api";

import { auth } from "./auth";

/**
 * Acceso desde el servidor (ADR-037): login, Google, cierre de sesión y contraseñas se hacen con
 * `auth.api.*` dentro de Server Actions, con las cookies fijadas por el plugin `nextCookies`.
 * Así el cliente de Better Auth no viaja al navegador.
 */
export type FalloAcceso = "credenciales" | "suspendida" | "bloqueada" | "invalido" | "error";

export type ResultadoAcceso = { ok: true } | { ok: false; fallo: FalloAcceso; mensaje: string };

function codigoDe(error: unknown): string | undefined {
  if (!(error instanceof APIError)) return undefined;
  const cuerpo = error.body as { code?: string } | undefined;
  return cuerpo?.code;
}

function fallo(fallo: FalloAcceso, mensaje: string): ResultadoAcceso {
  return { ok: false, fallo, mensaje };
}

/** Correo y contraseña. Un fallo de credenciales y un usuario inexistente responden igual. */
export async function entrarConPassword(email: string, password: string): Promise<ResultadoAcceso> {
  try {
    await auth.api.signInEmail({ body: { email, password }, headers: await headers() });
    return { ok: true };
  } catch (error) {
    if (codigoDe(error) === "ACCOUNT_SUSPENDED") {
      return fallo("suspendida", error instanceof Error ? error.message : "Cuenta suspendida.");
    }
    // Bloqueo por fuerza bruta persistido (B1): mensaje genérico, no revela si el correo existe.
    if (codigoDe(error) === "ACCOUNT_LOCKED") {
      return fallo("bloqueada", error instanceof Error ? error.message : "Acceso pausado.");
    }
    if (error instanceof APIError) return fallo("credenciales", "Credenciales inválidas.");
    throw error;
  }
}

/** URL de Google para iniciar el flujo OAuth, o null si no está configurado. */
export async function urlDeGoogle(callbackURL: string): Promise<string | null> {
  const r = await auth.api.signInSocial({
    body: { provider: "google", callbackURL, disableRedirect: true },
    headers: await headers(),
  });
  return r.url ?? null;
}

export async function cerrarSesion(): Promise<void> {
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch (error) {
    // Sin sesión no hay nada que cerrar.
    if (!(error instanceof APIError)) throw error;
  }
}

/** Cambia la contraseña del usuario con sesión y cierra sus otras sesiones. */
export async function cambiarPassword(actual: string, nueva: string): Promise<ResultadoAcceso> {
  try {
    await auth.api.changePassword({
      body: { currentPassword: actual, newPassword: nueva, revokeOtherSessions: true },
      headers: await headers(),
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof APIError)
      return fallo("credenciales", "La contraseña actual no es correcta.");
    throw error;
  }
}

/** Pide el enlace de recuperación. Nunca revela si el correo existe. */
export async function pedirRecuperacion(email: string, redirectTo: string): Promise<void> {
  try {
    await auth.api.requestPasswordReset({ body: { email, redirectTo }, headers: await headers() });
  } catch (error) {
    if (!(error instanceof APIError)) throw error;
  }
}

/** Nueva contraseña con el token del enlace (un solo uso, 30 minutos). */
export async function restablecerPassword(token: string, nueva: string): Promise<ResultadoAcceso> {
  try {
    await auth.api.resetPassword({ body: { token, newPassword: nueva }, headers: await headers() });
    return { ok: true };
  } catch (error) {
    if (error instanceof APIError) return fallo("invalido", "El enlace venció o ya se usó.");
    throw error;
  }
}
