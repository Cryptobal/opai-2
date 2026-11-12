import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { expireCookie } from "better-auth/cookies";

import { clienteAuth } from "@opai/db";

import { twoFactor } from "better-auth/plugins";

import { MFA_BLOQUEO_SEGUNDOS, MFA_LIMITE_INTENTOS } from "./opciones";
import { limpiarFallosMfaConSesion, reservarIntentoMfaConSesion } from "./mfa-bloqueo-con-sesion";

/** Verificar el código, con sesión ya creada: enrolamiento o login social con MFA pendiente (#68). */
const RUTAS_VERIFICAR_CON_SESION = ["/two-factor/verify-totp", "/two-factor/verify-backup-code"];

/** Plugin twoFactor (NÚCLEO-F): TOTP de 6 dígitos con bloqueo por cuenta en el login. */
export const pluginTwoFactor = () =>
  twoFactor({
    issuer: "OPAI",
    totpOptions: { digits: 6, period: 30 },
    accountLockout: {
      enabled: true,
      maxFailedAttempts: MFA_LIMITE_INTENTOS,
      durationSeconds: MFA_BLOQUEO_SEGUNDOS,
    },
  });

/** Rutas que cambian o agregan factores: exigen la sesión verificada si la cuenta ya tiene uno. */
const RUTAS_CON_FACTOR_COMPLETO = [
  "/two-factor/enable",
  "/two-factor/disable",
  "/two-factor/generate-backup-codes",
  "/two-factor/view-backup-codes",
  "/passkey/generate-register-options",
  "/passkey/verify-registration",
  // Cuenta y sesiones (CAR-286, autorrevisión): con solo la contraseña de una cuenta protegida por
  // passkey queda una sesión pendiente; no debe cambiar la contraseña, el perfil ni ver o cerrar
  // otras sesiones hasta completar el segundo factor.
  "/change-password",
  "/set-password",
  "/update-user",
  "/change-email",
  "/delete-user",
  "/list-sessions",
  "/revoke-session",
  "/revoke-sessions",
  "/revoke-other-sessions",
  "/list-accounts",
  "/link-social",
  "/unlink-account",
];

/**
 * ¿La sesión pertenece a una cuenta con segundo factor (TOTP o passkey) y aún no lo completó? Lee la
 * base (no la caché de cookie, que puede estar 60 s atrás).
 */
export async function segundoFactorPendiente(token: string): Promise<boolean> {
  const sesion = await clienteAuth().session.findUnique({
    where: { token },
    select: {
      mfaVerified: true,
      user: { select: { twoFactorEnabled: true, passkeyEnabled: true } },
    },
  });
  if (!sesion) return true;
  const conFactor = sesion.user.twoFactorEnabled || sesion.user.passkeyEnabled;
  return conFactor && !sesion.mfaVerified;
}

/** Se ejecuta también en los endpoints HTTP directos, no solo en las Server Actions. */
export const marcaMfaSesion = {
  id: "opai-mfa-sesion",
  hooks: {
    before: [
      {
        // Cambiar o agregar métodos exige haber completado el segundo factor si la cuenta ya tiene uno
        // (TOTP o passkey, CAR-286): con solo la contraseña de una cuenta protegida no se puede
        // enrolar otro factor para saltarse el que ya tiene.
        matcher: (ctx) => RUTAS_CON_FACTOR_COMPLETO.includes(ctx.path ?? ""),
        handler: createAuthMiddleware(async (ctx) => {
          const s = await getSessionFromCtx(ctx);
          if (!s?.session) return;
          if (await segundoFactorPendiente(s.session.token))
            throw new APIError("FORBIDDEN", { message: "Completa el segundo factor." });
        }),
      },
      {
        // Tope de intentos CUANDO YA HAY SESIÓN (mfa-bloqueo-con-sesion.ts): el `accountLockout` del
        // plugin twoFactor solo corre en el desafío de login SIN sesión. Reserva el intento de forma
        // atómica ANTES de verificar el código (Revisor, PR #65, review 5662691274): como vive en el
        // hook del plugin, se aplica igual a la Server Action y al POST directo al endpoint.
        matcher: (ctx) => RUTAS_VERIFICAR_CON_SESION.includes(ctx.path ?? ""),
        handler: createAuthMiddleware(async (ctx) => {
          const s = await getSessionFromCtx(ctx);
          if (!s?.session) return;
          const reserva = await reservarIntentoMfaConSesion(s.user.id);
          if (reserva === "bloqueada") {
            throw new APIError("TOO_MANY_REQUESTS", {
              code: "ACCOUNT_TEMPORARILY_LOCKED",
              message: "Demasiados intentos. Vuelve a intentarlo más tarde.",
            });
          }
        }),
      },
    ],
    after: [
      {
        matcher: (ctx) => RUTAS_VERIFICAR_CON_SESION.includes(ctx.path ?? ""),
        handler: createAuthMiddleware(async (ctx) => {
          const r = ctx.context.returned;
          if (r instanceof APIError || !r || typeof r !== "object" || !Reflect.get(r, "token"))
            return;
          const actual = ctx.context.newSession ?? ctx.context.session;
          if (!actual) return;
          // Una sola escritura condicionada al usuario y token verificados por Better Auth. No marca
          // otras sesiones del mismo usuario (incluidas las de Google que sigan pendientes).
          await clienteAuth().session.updateMany({
            where: {
              token: actual.session.token,
              userId: actual.user.id,
              user: { twoFactorEnabled: true },
            },
            data: { mfaVerified: true },
          });
          // Un código correcto reinicia el tope con sesión (reserva de arriba); sin sesión (desafío
          // de login) ya lo reinicia el propio plugin (`resetTwoFactorFailures`); repetirlo es inofensivo.
          await limpiarFallosMfaConSesion(actual.user.id);
          // `mfaVerified` cambió en la base, pero la caché de cookie (60 s) lo guardó en `false`: se
          // expira para que la siguiente lectura la rehaga desde la base y no deje al usuario en el
          // desafío hasta `maxAge`.
          expireCookie(ctx, ctx.context.authCookies.sessionData);
        }),
      },
    ],
  },
} satisfies BetterAuthPlugin;
