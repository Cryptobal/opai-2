import { createHmac, hkdfSync } from "node:crypto";

import type { BetterAuthPlugin } from "better-auth";
import { createAuthMiddleware, getSessionFromCtx } from "better-auth/api";

import { type EventoSeguridad, registrarEventoSeguridad } from "@opai/db";

import { CLAVE_SALIDA, evento } from "./rastro-eventos";

/**
 * Rastro de seguridad de la identidad (CAR-42, auditoría del Núcleo §I-03). Cada login, cierre de
 * sesión, cambio o recuperación de contraseña y paso del segundo factor deja un hecho en la cadena
 * `seguridad` de la auditoría global: usuario, tipo, resultado, HMAC de la IP y user agent. Va en
 * hooks de Better Auth, así cubre las Server Actions y el POST directo a `/api/auth/*` por igual.
 * Nunca guarda la IP ni el correo en claro, ni contraseñas, códigos o tokens.
 */

let claveCache: Buffer | null = null;

/** Clave del HMAC de la IP, derivada (HKDF-SHA256) del secreto de auth; distinta de la del bloqueo. */
function clave(): Buffer {
  if (claveCache) return claveCache;
  const secreto = process.env["BETTER_AUTH_SECRET"];
  if (!secreto) throw new Error("Falta BETTER_AUTH_SECRET para el HMAC de la IP.");
  claveCache = Buffer.from(hkdfSync("sha256", secreto, "", "opai:seguridad:ip", 32));
  return claveCache;
}

/** HMAC-SHA256 de la IP: permite correlacionar eventos de una misma IP sin guardarla. */
export function ipHmac(ip: string | null): string | null {
  return ip ? createHmac("sha256", clave()).update(ip.trim()).digest("hex") : null;
}

/** IP real del cliente (Vercel la pone primera en `x-forwarded-for`) y user agent. */
export function red(h: Headers | null | undefined) {
  const ip = h?.get("x-forwarded-for")?.split(",")[0]?.trim() || h?.get("x-real-ip") || null;
  return { ipHmac: ipHmac(ip), userAgent: h?.get("user-agent") || null };
}

type Hecho = Omit<EventoSeguridad, "ipHmac" | "userAgent">;

/**
 * Registra sin romper el flujo de acceso: armar el hecho (que puede consultar la base) y escribirlo
 * van en el mismo try; un fallo deja solo un aviso categórico, sin datos.
 */
export async function registrarSeguro(
  hecho: Hecho | (() => Promise<Hecho | null>),
  h: Headers | null | undefined,
): Promise<void> {
  try {
    const e = typeof hecho === "function" ? await hecho() : hecho;
    if (e) await registrarEventoSeguridad({ ...e, ...red(h) });
  } catch (error) {
    console.warn("[seguridad] no se pudo registrar el evento", {
      error: error instanceof Error ? error.name : typeof error,
    });
  }
}

/** Restablecimiento correcto: lo registra `onPasswordReset`, el único que conoce al usuario. */
export const rastroRestablecimiento = (userId: string, h: Headers | null | undefined) =>
  registrarSeguro(
    { tipo: "seguridad.password.restablecimiento", userId, detalle: { resultado: "ok" } },
    h,
  );

/**
 * Login pausado por el bloqueo (B1): el `before` lanza y el `after` no corre. Sin usuario: el
 * bloqueo cuenta por correo, exista o no la cuenta, y resolverlo aquí no aporta al rastro.
 */
export const rastroLoginPausado = (h: Headers | null | undefined) =>
  registrarSeguro(
    {
      tipo: "seguridad.login",
      userId: null,
      detalle: { resultado: "pausado", metodo: "password" },
    },
    h,
  );

/** Ruta → tipo de evento. Las rutas sin entrada no se registran. */
const TIPOS: Record<string, EventoSeguridad["tipo"]> = {
  "/sign-in/email": "seguridad.login",
  "/callback/:id": "seguridad.login",
  "/sign-out": "seguridad.logout",
  "/change-password": "seguridad.password.cambio",
  "/request-password-reset": "seguridad.password.recuperacion_pedida",
  "/reset-password": "seguridad.password.restablecimiento",
  "/two-factor/enable": "seguridad.mfa.enrolamiento",
  "/two-factor/disable": "seguridad.mfa.desactivacion",
  "/two-factor/generate-backup-codes": "seguridad.mfa.codigos_regenerados",
  "/two-factor/verify-totp": "seguridad.mfa.verificacion",
  "/two-factor/verify-backup-code": "seguridad.mfa.verificacion",
  // Passkeys (CAR-286): entrar y dar de alta. Bajas y nombres van por `core.seguridad.*`.
  "/passkey/verify-authentication": "seguridad.login",
  "/passkey/verify-registration": "seguridad.passkey.alta",
};

const METODOS: Record<string, string> = {
  "/sign-in/email": "password",
  "/callback/:id": "social",
  "/two-factor/verify-totp": "totp",
  "/two-factor/verify-backup-code": "respaldo",
  "/passkey/verify-authentication": "passkey",
  "/passkey/verify-registration": "passkey",
};

/** Último plugin antes de `nextCookies`: corre después de twoFactor y ve su respuesta final. */
export const rastroSeguridad = {
  id: "opai-rastro-seguridad",
  hooks: {
    before: [
      {
        matcher: (ctx) => ctx.path === "/sign-out",
        handler: createAuthMiddleware(async (ctx) => {
          const s = await getSessionFromCtx(ctx).catch(() => null);
          if (s?.user.id) return { context: { context: { [CLAVE_SALIDA]: s.user.id } } };
        }),
      },
    ],
    after: [
      {
        matcher: (ctx) => Boolean(ctx.path && TIPOS[ctx.path]),
        handler: createAuthMiddleware(async (ctx) => {
          const ruta = ctx.path ?? "";
          const tipo = TIPOS[ruta];
          if (!tipo) return;
          await registrarSeguro(() => evento(ctx, ruta, tipo, METODOS[ruta] ?? null), ctx.headers);
        }),
      },
    ],
  },
} satisfies BetterAuthPlugin;
