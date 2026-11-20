import { setSessionCookie } from "better-auth/cookies";

type CtxSesion = Parameters<typeof setSessionCookie>[0];
type UsuarioSesion = Parameters<typeof setSessionCookie>[1]["user"];

/** Crea sesión y fija la cookie; usado por plugins SERVER_ONLY que abren sesión tras verificación previa. */
export async function responderSesionAbierta(ctx: CtxSesion, usuario: UsuarioSesion) {
  const sesion = await ctx.context.internalAdapter.createSession(usuario.id);
  await setSessionCookie(ctx, { session: sesion, user: usuario });
  return ctx.json({ ok: true });
}