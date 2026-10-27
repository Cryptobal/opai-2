import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";

import { clienteAuth } from "@opai/db";

import { limpiarFallosMfaConSesion, reservarIntentoMfaConSesion } from "./mfa-bloqueo-con-sesion";

/** Verificar el código, con sesión ya creada: enrolamiento o login social con MFA pendiente (#68). */
const RUTAS_VERIFICAR_CON_SESION = ["/two-factor/verify-totp", "/two-factor/verify-backup-code"];

/** Se ejecuta también en los endpoints HTTP directos, no solo en las Server Actions. */
export const marcaMfaSesion = {
  id: "opai-mfa-sesion",
  hooks: {
    before: [
      {
        matcher: (ctx) =>
          [
            "/two-factor/enable",
            "/two-factor/disable",
            "/two-factor/generate-backup-codes",
            "/two-factor/view-backup-codes",
          ].includes(ctx.path ?? ""),
        handler: createAuthMiddleware(async (ctx) => {
          const s = await getSessionFromCtx(ctx);
          if (!s?.user.twoFactorEnabled) return;
          const sesion = await clienteAuth().session.findUnique({
            where: { token: s.session.token },
          });
          if (!sesion?.mfaVerified)
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
        }),
      },
    ],
  },
} satisfies BetterAuthPlugin;
