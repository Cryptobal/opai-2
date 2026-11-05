// Validación de las etapas que un plan de seguimiento nombra (CAR-162, N1 de #296).
import type { ConfigPlan } from "@opai/domain";

import { reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";

const CAMPOS = [
  ["etapaAlResponder", "La etapa «al responder»"],
  ["noCerrarDesdeEtapa", "La etapa «no cerrar desde»"],
] as const;

/**
 * Cada etapa del plan debe existir en un embudo activo de esta empresa y estar activa. Una etapa de
 * otra empresa se informa igual que una inexistente (sin revelar que existe).
 */
export async function validarEtapasDelPlan(ctx: Contexto, config: ConfigPlan): Promise<void> {
  for (const [campo, nombre] of CAMPOS) {
    const id = config[campo];
    if (!id) continue;
    const etapa = await ctx.db.etapa.findFirst({ where: { id, tenantId: ctx.tenantId, activa: true }, select: { embudoId: true } });
    const embudo = etapa ? await ctx.db.embudo.findFirst({ where: { id: etapa.embudoId, tenantId: ctx.tenantId, activo: true }, select: { id: true } }) : null;
    if (!embudo) throw reglaDeNegocio(`${nombre} no existe en el embudo de la empresa o está inactiva.`);
  }
}
