import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";

import { clienteAuth } from "@opai/db";
import { COMUNICABLES_NUCLEO, renderizarCorreo } from "@opai/domain";
import { mailerDelEntorno } from "@opai/integrations/email";

import { bloqueoDeIngreso, mensajeBloqueo } from "./acceso";
import {
  CLAVE_INTENTO,
  datosDeContexto,
  intentoDeContexto,
  MENSAJE_PAUSA,
  registrarRestablecimiento,
  reservarIntento,
  resolverIntento,
} from "./bloqueo-login";
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
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: LARGO_MINIMO_PASSWORD,
    resetPasswordTokenExpiresIn: VIGENCIA_RECUPERACION_SEGUNDOS,
    revokeSessionsOnPasswordReset: true,
    // Un restablecimiento exitoso reinicia el contador de bloqueo del correo (B1, §16.3): Better Auth
    // ya validó el enlace. Best-effort: anotar no debe romper el flujo ni filtrar datos (Ley 21.719).
    async onPasswordReset({ user }: { user: { email: string } }) {
      try {
        await registrarRestablecimiento(user.email);
      } catch {
        console.warn("[bloqueo-login] no se pudo reiniciar el contador tras el restablecimiento");
      }
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
        },
      },
    },
  },
  // Bloqueo de login persistido por cuenta (B1, Brief 07c). Se engancha en `sign-in/email` sobre la
  // capa de Better Auth, no solo en la Server Action, para que cubra también el POST directo a
  // `/api/auth/.../sign-in/email` y no sea evitable saltándose la UI. El límite en memoria de la
  // librería y el de `apps/web/lib/rate-limit.ts` siguen como primera barrera barata.
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email") return;
      const datos = datosDeContexto(ctx);
      if (!datos) return;
      // Cuenta e inserta el provisional bajo el advisory lock; si ya superó el límite, o el lock lo
      // tiene otro intento del mismo correo, responde 429 sin esperar (mismo cuerpo en ambos casos).
      // Al lanzar aquí, Better Auth no corre el `after`, así que no deja un provisional colgado.
      const reserva = await reservarIntento(datos);
      if (reserva.estado !== "ok") {
        throw new APIError("TOO_MANY_REQUESTS", { code: "ACCOUNT_LOCKED", message: MENSAJE_PAUSA });
      }
      // El id del provisional viaja al `after` en el contexto de la petición (no por correo e IP).
      return { context: { context: { [CLAVE_INTENTO]: reserva.intentoId } } };
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email") return;
      const intentoId = intentoDeContexto(ctx.context);
      if (!intentoId) return;
      const r = ctx.context.returned;
      const codigo =
        r instanceof APIError ? ((r.body as { code?: string } | undefined)?.code ?? "ERROR") : null;
      try {
        await resolverIntento(intentoId, codigo);
      } catch (e) {
        // Resolver el provisional es best-effort: un fallo al marcarlo no debe romper el login ni
        // filtrar datos (sin imprimir valores, Ley 21.719); el provisional caduca con la ventana.
        console.warn("[bloqueo-login] no se pudo resolver el intento de login", {
          error: e instanceof Error ? e.name : typeof e,
        });
      }
    }),
  },
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
    nextCookies(),
  ],
});

export type Auth = typeof auth;
export type SesionAuth = typeof auth.$Infer.Session;
