import { headers } from "next/headers";

import { APIError } from "better-auth/api";

import { auth } from "./auth";
import { MENSAJE_PAUSA } from "./bloqueo-login";
import {
  cuentaBloqueada,
  cuentaMfaConSesion,
  limpiarFallosDeCuenta,
  registrarFalloDeCuenta,
} from "./mfa-bloqueo-con-sesion";
import type { FalloAcceso, ResultadoAcceso } from "./acciones";

/**
 * Segundo factor (NÚCLEO-F) desde el servidor (ADR-037): enrolar, verificar en el login y desactivar
 * se hacen con `auth.api.*` dentro de Server Actions; el cliente de Better Auth no viaja al navegador.
 * Los mensajes son genéricos y no revelan intentos restantes ni si existe un enrolamiento (enumeración).
 */

const MENSAJE_CODIGO = "El código no es correcto. Revísalo y vuelve a intentarlo.";
const MENSAJE_DESAFIO = "El acceso expiró. Vuelve a iniciar sesión.";

function codigoDe(error: unknown): string | undefined {
  if (!(error instanceof APIError)) return undefined;
  return (error.body as { code?: string } | undefined)?.code;
}

/** Código HTTP del `APIError` (429 cuando un límite de tasa, como el por IP del #64, corta el intento). */
function estadoHttpDe(error: unknown): number | undefined {
  return error instanceof APIError ? error.statusCode : undefined;
}

function fallo(f: FalloAcceso, mensaje: string): ResultadoAcceso {
  return { ok: false, fallo: f, mensaje };
}

/**
 * Traduce un fallo de un paso de verificación de segundo factor a un `ResultadoAcceso`. El bloqueo por
 * cuenta y el agotamiento de intentos del desafío comparten el aviso genérico del login (`MENSAJE_PAUSA`);
 * un código inválido no distingue el motivo; un desafío expirado o inexistente manda a reiniciar.
 */
function falloDeVerificacion(error: unknown): ResultadoAcceso {
  const codigo = codigoDe(error);
  // Límite de tasa (429): el tope por IP del #64 o el del propio plugin. Comparte el aviso genérico de
  // pausa del login en vez de parecer un «código incorrecto», que confundiría a quien no se equivocó.
  if (estadoHttpDe(error) === 429 || codigo === "TOO_MANY_REQUESTS") {
    return fallo("bloqueada", MENSAJE_PAUSA);
  }
  if (codigo === "ACCOUNT_TEMPORARILY_LOCKED" || codigo === "TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE") {
    return fallo("bloqueada", MENSAJE_PAUSA);
  }
  if (codigo === "INVALID_TWO_FACTOR_COOKIE") return fallo("invalido", MENSAJE_DESAFIO);
  if (error instanceof APIError) return fallo("credenciales", MENSAJE_CODIGO);
  throw error;
}

/**
 * Enrolamiento (en sesión): valida la contraseña y devuelve el URI del TOTP (para el QR) y los códigos
 * de respaldo, que se muestran una sola vez. Aún no activa el segundo factor: queda `verified=false`
 * hasta que el usuario confirme un código con {@link confirmarSegundoFactor}.
 */
export async function iniciarSegundoFactor(
  password: string,
): Promise<
  | { ok: true; totpURI: string; secret: string; backupCodes: string[] }
  | { ok: false; mensaje: string }
> {
  try {
    const r = await auth.api.enableTwoFactor({ body: { password }, headers: await headers() });
    if (r.method !== "totp") return { ok: false, mensaje: "No se pudo iniciar el segundo factor." };
    // La clave en base32 (para quien no puede escanear el QR) viaja en el parámetro `secret` del URI.
    const secret = new URL(r.totpURI).searchParams.get("secret") ?? "";
    return { ok: true, totpURI: r.totpURI, secret, backupCodes: r.backupCodes };
  } catch (error) {
    if (codigoDe(error) === "INVALID_PASSWORD") {
      return { ok: false, mensaje: "La contraseña no es correcta." };
    }
    if (codigoDe(error) === "TOTP_ALREADY_ENABLED") {
      return { ok: false, mensaje: "Ya tienes el segundo factor activo." };
    }
    if (error instanceof APIError) {
      return { ok: false, mensaje: "No se pudo iniciar el segundo factor." };
    }
    throw error;
  }
}

/** Confirma el enrolamiento con un código del autenticador (en sesión): activa el segundo factor. */
export async function confirmarSegundoFactor(code: string): Promise<ResultadoAcceso> {
  try {
    await auth.api.verifyTOTP({ body: { code }, headers: await headers() });
    return { ok: true };
  } catch (error) {
    return falloDeVerificacion(error);
  }
}

/**
 * Verifica el segundo factor en el login con un código TOTP (desafío por cookie, sin sesión aún).
 * Si YA hay una sesión (Google u otro proveedor social con MFA pendiente, #68), el bloqueo por cuenta
 * del plugin no se aplica (ver `mfa-bloqueo-con-sesion.ts`); se replica aquí con las mismas columnas.
 */
export async function verificarSegundoFactor(code: string): Promise<ResultadoAcceso> {
  const h = await headers();
  const cuenta = await cuentaMfaConSesion(h);
  if (cuenta && cuentaBloqueada(cuenta)) return fallo("bloqueada", MENSAJE_PAUSA);
  try {
    await auth.api.verifyTOTP({ body: { code }, headers: h });
    if (cuenta) await limpiarFallosDeCuenta(cuenta.id);
    return { ok: true };
  } catch (error) {
    if (cuenta) await registrarFalloDeCuenta(cuenta.id);
    return falloDeVerificacion(error);
  }
}

/** Verifica el segundo factor en el login con un código de respaldo (de un solo uso). */
export async function verificarCodigoRespaldo(code: string): Promise<ResultadoAcceso> {
  const h = await headers();
  const cuenta = await cuentaMfaConSesion(h);
  if (cuenta && cuentaBloqueada(cuenta)) return fallo("bloqueada", MENSAJE_PAUSA);
  try {
    await auth.api.verifyBackupCode({ body: { code }, headers: h });
    if (cuenta) await limpiarFallosDeCuenta(cuenta.id);
    return { ok: true };
  } catch (error) {
    if (cuenta) await registrarFalloDeCuenta(cuenta.id);
    return falloDeVerificacion(error);
  }
}

/** Desactiva el segundo factor; exige la contraseña (lo irreversible queda en la sesión). */
export async function desactivarSegundoFactor(password: string): Promise<ResultadoAcceso> {
  try {
    await auth.api.disableTwoFactor({ body: { password }, headers: await headers() });
    return { ok: true };
  } catch (error) {
    if (codigoDe(error) === "INVALID_PASSWORD") {
      return fallo("credenciales", "La contraseña no es correcta.");
    }
    if (error instanceof APIError)
      return fallo("error", "No se pudo desactivar el segundo factor.");
    throw error;
  }
}
