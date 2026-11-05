// Validación de las etapas que un plan de seguimiento nombra (CAR-162, N1 de #296). Se usa al guardar
// el plan y de nuevo al ejecutarlo o leerlo: una etapa borrada o desactivada después de guardar el plan
// da un resultado claro y no rompe el trabajo (CAR-192).
import type { ConfigPlan } from "@opai/domain";

import { reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";

const CAMPOS = [
  ["etapaAlResponder", "La etapa «al responder»"],
  ["noCerrarDesdeEtapa", "La etapa «no cerrar desde»"],
] as const;

export type CampoEtapaPlan = (typeof CAMPOS)[number][0];
export type EtapaInvalida = { campo: CampoEtapaPlan; mensaje: string };

/**
 * Etapas del plan que ya no sirven: no existen en esta empresa, están inactivas o su embudo lo está.
 * Una etapa de otra empresa se informa igual que una inexistente (sin revelar que existe).
 */
export async function etapasInvalidasDelPlan(ctx: Contexto, config: ConfigPlan): Promise<EtapaInvalida[]> {
  const invalidas: EtapaInvalida[] = [];
  for (const [campo, nombre] of CAMPOS) {
    const id = config[campo];
    if (!id) continue;
    const etapa = await ctx.db.etapa.findFirst({ where: { id, tenantId: ctx.tenantId, activa: true }, select: { embudoId: true } });
    const embudo = etapa ? await ctx.db.embudo.findFirst({ where: { id: etapa.embudoId, tenantId: ctx.tenantId, activo: true }, select: { id: true } }) : null;
    if (!embudo) invalidas.push({ campo, mensaje: `${nombre} no existe en el embudo de la empresa o está inactiva.` });
  }
  return invalidas;
}

/** Al guardar el plan: cada etapa debe existir en un embudo activo de esta empresa y estar activa. */
export async function validarEtapasDelPlan(ctx: Contexto, config: ConfigPlan): Promise<void> {
  const [primera] = await etapasInvalidasDelPlan(ctx, config);
  if (primera) throw reglaDeNegocio(primera.mensaje);
}
