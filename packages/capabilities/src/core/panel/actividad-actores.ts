import type { Contexto } from "../../types";

/** Nombres a mostrar por id de actor: usuarios por membership, keys de agente por ApiKey. */
export async function nombres(ctx: Contexto, usuarios: string[], keys: string[]) {
  const [m, k] = await Promise.all([
    ctx.db.membership.findMany({ where: { userId: { in: usuarios } }, include: { user: true } }),
    ctx.db.apiKey.findMany({
      where: { id: { in: keys.filter((id) => !id.startsWith("agente-interno:")) } },
      select: { id: true, nombre: true, principalTipo: true },
    }),
  ]);
  return new Map([
    ...keys
      .filter((id) => id.startsWith("agente-interno:"))
      .map((id) => [id, "Agente interno"] as const),
    ...m.map((x) => [x.userId, x.user.name] as const),
    // Un agente de servicio se distingue en la auditoría: "agente <nombre> (servicio)" (t457u).
    ...k.map(
      (x) => [x.id, x.principalTipo === "servicio" ? `${x.nombre} (servicio)` : x.nombre] as const,
    ),
  ]);
}
