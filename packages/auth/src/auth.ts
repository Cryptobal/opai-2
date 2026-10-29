import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";

import { clienteAuth } from "@opai/db";
import { COMUNICABLES_NUCLEO, renderizarCorreo } from "@opai/domain";
import { mailerDelEntorno } from "@opai/integrations/email";

import { bloqueoDeIngreso, mensajeBloqueo } from "./acceso";
import { hooksLogin } from "./auth-hooks";
import { marcaMfaSesion } from "./mfa-sesion";
import { registrarRestablecimiento } from "./bloqueo-login";
import { auditarSeguridad } from "./seguridad";
import {
  camposUsuario,
  LARGO_MINIMO_PASSWORD,
  MFA_BLOQUEO_SEGUNDOS,
  MFA_LIMITE_INTENTOS,
  origenesConfiables,
  proveedoresSociales,
  VIGENCIA_RECUPERACION_SEGUNDOS,
} from "./opciones";

const env = process.env;

/**
 * Servidor de Better Auth (ADR-015). Base path `/api/auth`. Correo y contraseña sin registro
 * público (se entra por invitación), Google opcional, recuperación por enlace, sesiones con cookie.
 * `BETTER_AUTH_SECRET` y `BETTER_AUTH_URL` se leen del entorno.
 */
export const auth = betterAuth({
  appName: "OPAI",
  basePath: "/api/auth",
  database: prismaAdapter(clienteAuth(), { provider: "postgresql" }),
  trustedOrigins: origenesConfiables(env),
  advanced: {
    cookiePrefix: "opai",
    // Prisma genera uuid(7) (`@default(uuid(7))`); Better Auth no envía id.
    database: { generateId: false },
  },
  user: { additionalFields: camposUsuario },
  session: {
    additionalFields: { mfaVerified: { type: "boolean", defaultValue: false, input: false } },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: LARGO_MINIMO_PASSWORD,
    resetPasswordTokenExpiresIn: VIGENCIA_RECUPERACION_SEGUNDOS,
    revokeSessionsOnPasswordReset: true,
    // Un restablecimiento exitoso reinicia el contador de bloqueo del correo (B1, §16.3): Better Auth
    // ya validó el enlace. Best-effort: anotar no debe romper el flujo ni filtrar datos (Ley 21.719).
    async onPasswordReset({ user }: { user: { id: string; email: string } }, request?: Request) {
      try {
        await registrarRestablecimiento(user.email);
      } catch {
        console.warn("[bloqueo-login] no se pudo reiniciar el contador tras el restablecimiento");
      }
      // CAR-42: registro de seguridad global (append-only, sin tenant), con IP en HMAC y user agent.
      await auditarSeguridad(
        "seguridad.password_restablecer",
        user.id,
        request?.headers ?? new Headers(),
      );
    },
    async sendResetPassword({ user, url }) {
      // Plantilla transaccional del núcleo (ADR-020) con la marca de OPAI: no hay tenant aún.
      const e = COMUNICABLES_NUCLEO.find((x) => x.evento === "core.usuario.recuperacion");
      if (!e?.plantillas.correo) throw new Error("Falta la plantilla de recuperación.");
      const r = renderizarCorreo(
        e,
        e.plantillas.correo,
        { usuario: { nombre: user.name }, url },
        { nombre: "OPAI" },
      );
      // Si el correo falla (p. ej. sin RESEND_API_KEY en un entorno desplegado, CAR-51) no se
      // propaga: un error solo para cuentas existentes revelaría cuáles existen. El log no lleva
      // destinatario ni enlace.
      await mailerDelEntorno()
        .enviar({ para: user.email, asunto: r.asunto, texto: r.texto, html: r.html })
        .catch((error: unknown) => {
          const motivo = error instanceof Error ? error.message : "error desconocido";
          console.error(`[correo] no se envió la recuperación de contraseña: ${motivo}`);
        });
    },
  },
  socialProviders: proveedoresSociales(env),
  // Tokens de recuperación y verificación: solo su hash en `core.verifications`.
  verification: { storeIdentifier: "hashed" },
  rateLimit: {
    enabled: env["NODE_ENV"] === "production",
    window: 60,
    max: 100,
    // Primera barrera barata en memoria (5 cada 15 min); el tope real vive en la base (B1).
    customRules: { "/sign-in/email": { window: 15 * 60, max: 5 } },
  },
  databaseHooks: {
    session: {
      create: {
        // Un tenant suspendido rechaza el ingreso de sus miembros; plataforma sigue entrando.
        // Corre después de validar la contraseña: el motivo solo lo ve quien la conoce.
        async before(session) {
          const bloqueo = await bloqueoDeIngreso(session.userId);
          if (bloqueo) {
            throw new APIError("FORBIDDEN", {
              message: mensajeBloqueo(bloqueo),
              code: "ACCOUNT_SUSPENDED",
            });
          }
          return { data: { ...session, mfaVerified: false } };
        },
      },
    },
  },
  // Bloqueo de login persistido por cuenta (B1, Brief 07c) y registro de seguridad (CAR-42):
  // `./auth-hooks` se engancha en `sign-in/email` y `change-password` sobre la capa de Better Auth,
  // no solo en la Server Action, para que cubra también el POST directo a `/api/auth/...` y no sea
  // evitable saltándose la UI.
  hooks: hooksLogin,
  // Segundo factor (NÚCLEO-F, ADR-015). TOTP con códigos de respaldo; el secreto y los códigos los
  // cifra el plugin con `BETTER_AUTH_SECRET` (sin secreto nuevo). El bloqueo del paso de verificar el
  // código es por cuenta (atómico, a través de desafíos y factores), alineado con el bloqueo de login;
  // el mensaje se normaliza a `MENSAJE_PAUSA` en las Server Actions (ver `mfa.ts`). `nextCookies()`
  // queda último (requisito de Better Auth) y fija las cookies `opai.*`, incluida la del desafío 2FA.
  plugins: [
    twoFactor({
      issuer: "OPAI",
      totpOptions: { digits: 6, period: 30 },
      accountLockout: {
        enabled: true,
        maxFailedAttempts: MFA_LIMITE_INTENTOS,
        durationSeconds: MFA_BLOQUEO_SEGUNDOS,
      },
    }),
    marcaMfaSesion,
    nextCookies(),
  ],
});

export type Auth = typeof auth;
export type SesionAuth = typeof auth.$Infer.Session;
