import { prohibido } from "../errores";
import type { Contexto } from "../types";

export async function exigirOwnerAdmin(ctx: Contexto) {
  if (ctx.rol !== "owner" && ctx.rol !== "admin") {
    throw prohibido("Solo owner o admin pueden importar datos desde OPAI 1.0.");
  }
}

export async function resolverUsuarios(
  ctx: Contexto,
  usuarios: readonly { id: string; email: string }[],
) {
  let resueltos = 0;
  const sinMembresia: string[] = [];
  for (const u of usuarios) {
    const user = await ctx.db.user.findFirst({
      where: { email: u.email.toLowerCase() },
      select: { id: true },
    });
    if (!user) {
      sinMembresia.push(u.id);
      continue;
    }
    const m = await ctx.db.membership.findFirst({
      where: { tenantId: ctx.tenantId, userId: user.id },
      select: { id: true },
    });
    if (m) resueltos += 1;
    else sinMembresia.push(u.id);
  }
  return { resueltos, sinMembresia };
}
