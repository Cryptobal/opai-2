import { PERMISOS_CORE } from "@opai/domain";

import type { Contexto } from "../../types";
import type { FilaEstructura, FilaItem } from "./estructuras-vista";

/**
 * ¿Hay que ocultar montos? Sí si el cargo involucrado tiene sueldo sensible y el actor no tiene
 * `core:estructuras.read_sensible`. El cargo sale de la estructura, de su puesto o del vínculo
 * vigente de la persona.
 */
export async function ocultarMontos(
  ctx: Contexto,
  e: Pick<FilaEstructura, "cargoId" | "puestoId" | "personaId">,
): Promise<boolean> {
  if (ctx.autorizar(PERMISOS_CORE.estructurasReadSensible)) return false;
  let cargoId = e.cargoId ?? null;
  if (!cargoId && e.puestoId) {
    cargoId = (await ctx.db.puesto.findUnique({ where: { id: e.puestoId } }))?.cargoId ?? null;
  }
  if (!cargoId && e.personaId) {
    const v = await ctx.db.vinculoLaboral.findFirst({
      where: { personaId: e.personaId, estado: "vigente" },
    });
    cargoId = v?.cargoId ?? null;
  }
  // Sin cargo determinable (persona sin vínculo vigente): se oculta por prudencia.
  if (!cargoId) return true;
  return (await ctx.db.cargo.findUnique({ where: { id: cargoId } }))?.sueldoSensible ?? false;
}

export async function itemsDe(ctx: Contexto, estructuraIds: string[]) {
  const items = await ctx.db.estructuraItem.findMany({
    where: { estructuraId: { in: estructuraIds } },
    orderBy: { orden: "asc" },
  });
  const por = new Map<string, FilaItem[]>();
  for (const i of items) por.set(i.estructuraId, [...(por.get(i.estructuraId) ?? []), i]);
  return por;
}
