import { passkey } from "@better-auth/passkey";
import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { expireCookie } from "better-auth/cookies";

import { clienteAuth } from "@opai/db";

import { relyingParty } from "./opciones";

/**
 * Passkeys (WebAuthn: Face ID, huella o llave física) con el plugin de Better Auth (CAR-286). Sirven
 * para entrar sin contraseña y como segundo factor, por eso se exige verificación del usuario (UV:
 * biometría o PIN del dispositivo) al registrar y al entrar: una passkey sin UV sería solo «algo que
 * tienes». El origen y el RP ID salen de `BETTER_AUTH_URL` (no de cabeceras del cliente).
 */
const SIN_VERIFICACION = "Tu dispositivo no confirmó tu identidad (huella, rostro o PIN).";

function exigirVerificacion(verificado: boolean | undefined): void {
  if (!verificado)
    throw new APIError("UNAUTHORIZED", {
      code: "PASSKEY_SIN_VERIFICACION",
      message: SIN_VERIFICACION,
    });
}

export function pluginPasskey(env: Record<string, string | undefined> = process.env) {
  return passkey({
    rpName: "OPAI",
    ...relyingParty(env),
    authenticatorSelection: { residentKey: "required", userVerification: "required" },
    registration: {
      afterVerification: async ({ verification }) => {
        exigirVerificacion(verification.registrationInfo?.userVerified);
      },
    },
    authentication: {
      afterVerification: async ({ verification }) => {
        exigirVerificacion(verification.authenticationInfo.userVerified);
      },
    },
  });
}

/**
 * Listar, renombrar y borrar passkeys van por las capacidades `core.metodos_acceso.*` (con auditoría y
 * confirmación de identidad), no por los endpoints genéricos del plugin.
 */
export const RUTAS_PASSKEY_DESACTIVADAS = [
  "/passkey/list-user-passkeys",
  "/passkey/update-passkey",
  "/passkey/delete-passkey",
];

/** Clave del contexto donde el `before` deja el token de una sesión previa (MFA pendiente). */
const CLAVE_PREVIA = "opaiSesionPreviaPasskey";

/**
 * Efectos de OPAI sobre las rutas del plugin (también para el POST directo a `/api/auth/*`):
 * - Entrar con passkey (con UV) completa el segundo factor de la sesión nueva, borra la sesión previa
 *   que esperaba el segundo factor y el desafío TOTP pendiente.
 * - Registrar una passkey marca la sesión actual como verificada: la persona acaba de demostrar el
 *   dispositivo con UV (sin esto, la primera passkey la mandaría a /mfa en el acto).
 * La caché de cookie (60 s) guardó `mfaVerified: false`: se expira para que la próxima lectura vaya
 * a la base.
 */
export const marcaPasskey = {
  id: "opai-passkey",
  hooks: {
    before: [
      {
        matcher: (ctx) => ctx.path === "/passkey/verify-authentication",
        handler: createAuthMiddleware(async (ctx) => {
          const s = await getSessionFromCtx(ctx).catch(() => null);
          if (s?.session.token)
            return { context: { context: { [CLAVE_PREVIA]: s.session.token } } };
        }),
      },
    ],
    after: [
      {
        matcher: (ctx) =>
          ctx.path === "/passkey/verify-authentication" ||
          ctx.path === "/passkey/verify-registration",
        handler: createAuthMiddleware(async (ctx) => {
          const r = ctx.context.returned;
          if (r instanceof APIError || !r || typeof r !== "object") return;
          const actual = ctx.context.newSession ?? ctx.context.session;
          if (!actual) return;
          await clienteAuth().session.updateMany({
            where: { token: actual.session.token, userId: actual.user.id },
            data: { mfaVerified: true },
          });
          if (ctx.path === "/passkey/verify-authentication") {
            const previa: unknown = Reflect.get(ctx.context, CLAVE_PREVIA);
            if (typeof previa === "string" && previa && previa !== actual.session.token)
              await clienteAuth().session.deleteMany({
                where: { token: previa, mfaVerified: false },
              });
            expireCookie(ctx, ctx.context.createAuthCookie("two_factor"));
          }
          expireCookie(ctx, ctx.context.authCookies.sessionData);
        }),
      },
    ],
  },
} satisfies BetterAuthPlugin;
