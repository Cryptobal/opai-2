import { auth } from "./auth";

/**
 * Correo del usuario de un enlace de recuperación vigente, o null si venció o ya se usó.
 * Better Auth guarda el token hasheado; la búsqueda la hace su adaptador.
 */
export async function correoDeRecuperacion(token: string): Promise<string | null> {
  const ctx = await auth.$context;
  const v = await ctx.internalAdapter.findVerificationValue(`reset-password:${token}`);
  if (!v || v.expiresAt.getTime() < Date.now()) return null;
  const usuario = await ctx.internalAdapter.findUserById(v.value);
  return usuario?.email ?? null;
}
