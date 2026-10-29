import { APIError } from "better-auth/api";

import type { EventoSeguridad } from "@opai/db";

/** Clave del contexto donde el `before` de `/sign-out` deja el usuario (después ya no hay sesión). */
export const CLAVE_SALIDA = "opaiSalidaUserId";

type Usuario = { user: { id: string } } | null | undefined;

/** Lo que el rastro lee del contexto de un hook `after` de Better Auth. */
export type CtxRastro = {
  body?: unknown;
  context: {
    returned?: unknown;
    newSession?: Usuario;
    session?: Usuario;
    internalAdapter: { findUserByEmail(email: string): Promise<Usuario> };
  };
};

/** Código del `APIError` de Better Auth (o de los hooks de OPAI), sin el mensaje. */
export function codigoDeError(r: unknown): string {
  if (!(r instanceof APIError)) return "ERROR";
  return (r.body as { code?: string } | undefined)?.code ?? String(r.statusCode);
}

/** Usuario del hecho: el de la sesión nueva o vigente, el que salió, o el del correo del body. */
async function usuarioDe(ctx: CtxRastro): Promise<string | null> {
  const id = ctx.context.newSession?.user.id ?? ctx.context.session?.user.id;
  if (id) return id;
  const salida: unknown = Reflect.get(ctx.context, CLAVE_SALIDA);
  if (typeof salida === "string" && salida) return salida;
  const correo: unknown =
    ctx.body && typeof ctx.body === "object" ? Reflect.get(ctx.body, "email") : undefined;
  if (typeof correo !== "string" || !correo.trim()) return null;
  const u = await ctx.context.internalAdapter.findUserByEmail(correo.trim().toLowerCase());
  return u?.user.id ?? null;
}

/**
 * Hecho de seguridad de una ruta de Better Auth, o null si no corresponde registrarlo aquí (el
 * restablecimiento correcto lo registra `onPasswordReset`, que sí conoce al usuario).
 */
export async function evento(
  ctx: CtxRastro,
  ruta: string,
  tipo: EventoSeguridad["tipo"],
  metodo: string | null,
): Promise<Omit<EventoSeguridad, "ipHmac" | "userAgent"> | null> {
  const r = ctx.context.returned;
  // El callback de OAuth siempre termina en una redirección (un APIError 302): manda la sesión.
  const fallido = ruta === "/callback/:id" ? !ctx.context.newSession : r instanceof APIError;
  if (ruta === "/reset-password" && !fallido) return null;
  const mfaPendiente =
    !fallido && r !== null && typeof r === "object" && Reflect.get(r, "twoFactorRedirect") === true;
  const resultado = fallido ? "fallido" : mfaPendiente ? "mfa_pendiente" : "ok";
  return {
    tipo,
    userId: await usuarioDe(ctx),
    detalle: {
      resultado,
      ...(metodo ? { metodo } : {}),
      ...(fallido && ruta !== "/callback/:id" ? { motivo: codigoDeError(r) } : {}),
    },
  };
}
