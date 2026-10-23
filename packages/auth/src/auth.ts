import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";

import { clienteAuth } from "@opai/db";
import { COMUNICABLES_NUCLEO, renderizarCorreo } from "@opai/domain";
import { mailerDelEntorno } from "@opai/integrations/email";

import { bloqueoDeIngreso, mensajeBloqueo } from "./acceso";
import {
  camposUsuario,
  LARGO_MINIMO_PASSWORD,
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
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: LARGO_MINIMO_PASSWORD,
    resetPasswordTokenExpiresIn: VIGENCIA_RECUPERACION_SEGUNDOS,
    revokeSessionsOnPasswordReset: true,
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
      await mailerDelEntorno().enviar({
        para: user.email,
        asunto: r.asunto,
        texto: r.texto,
        html: r.html,
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
    // "Tras 5 intentos pausaremos el acceso por 15 minutos" (diseño de acceso aprobado).
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
        },
      },
    },
  },
  plugins: [nextCookies()],
});

export type Auth = typeof auth;
export type SesionAuth = typeof auth.$Infer.Session;
