import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

import { clienteAuth } from "@opai/db";
import { mailerDelEntorno } from "@opai/integrations/email";

import { puedeIniciarSesion } from "./acceso";
import {
  camposUsuario,
  LARGO_MINIMO_PASSWORD,
  origenesConfiables,
  proveedoresSociales,
  VIGENCIA_ENLACE_SEGUNDOS,
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
    resetPasswordTokenExpiresIn: VIGENCIA_ENLACE_SEGUNDOS,
    revokeSessionsOnPasswordReset: true,
    async sendResetPassword({ user, url }) {
      await mailerDelEntorno().enviar({
        para: user.email,
        asunto: "Recupera tu contraseña de OPAI",
        texto: `Hola ${user.name}:\n\nPara crear una contraseña nueva abre este enlace (vence en 72 horas y sirve una sola vez):\n${url}\n\nSi no lo pediste, ignora este correo.`,
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
    customRules: { "/sign-in/email": { window: 60, max: 10 } },
  },
  databaseHooks: {
    session: {
      create: {
        // Un tenant suspendido rechaza el ingreso de sus miembros; plataforma sigue entrando.
        async before(session) {
          return (await puedeIniciarSesion(session.userId)) ? undefined : false;
        },
      },
    },
  },
  plugins: [nextCookies()],
});

export type Auth = typeof auth;
export type SesionAuth = typeof auth.$Infer.Session;
