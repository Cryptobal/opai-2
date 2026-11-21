import type { Contexto } from "../../types";
import { rolVisible } from "./objetivo";

export type Item = { id: string; nombre: string; detalle: string | null };
export type Tramo = { q: string; cursor: string | undefined; limite: number };

export const busca = (q: string) => ({ contains: q, mode: "insensitive" as const });

export async function visibles(ctx: Contexto, portal: string) {
  const filas = await ctx.db.membership.findMany({
    where: { tenantId: ctx.tenantId, estado: "activa", portales: { has: portal } },
    select: { id: true, userId: true, rol: true },
  });
  return filas.filter((m) => rolVisible(ctx, m.rol) && m.userId !== ctx.usuario?.id);
}