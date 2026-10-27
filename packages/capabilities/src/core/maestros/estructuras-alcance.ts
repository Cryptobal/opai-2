import type { Prisma } from "@opai/db";

import type { Contexto } from "../../types";
import { dondePuesto, instalacionesEnAlcance } from "./alcance";

/** El catálogo cargo es del tenant; puestos solo de instalaciones a cargo. Personas: 07b pendiente. */
export async function dondeEstructura(ctx: Contexto): Promise<Prisma.EstructuraSueldoWhereInput> {
  if (instalacionesEnAlcance(ctx) === null) return {};
  const puestos = await ctx.db.puesto.findMany({ where: dondePuesto(ctx), select: { id: true } });
  return {
    OR: [{ nivel: "cargo" }, { nivel: "puesto", puestoId: { in: puestos.map((p) => p.id) } }],
  };
}
