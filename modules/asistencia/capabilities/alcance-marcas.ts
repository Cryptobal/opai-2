import { prohibido, type Contexto } from "@opai/capabilities";

import { personaPropia } from "./persona-propia";

const dePersona = (ctx: Contexto) => ctx.portal === "trabajador" || ctx.portal === "terreno";

/**
 * Filtro de filas (ADR-022): el trabajador ve solo lo propio; quien tiene `asistencia:ver` ve lo de las
 * instalaciones a su cargo (el supervisor) o de toda la empresa (alcance nulo). Se aplica en la consulta.
 */
export async function alcanceMarcas(ctx: Contexto): Promise<{ personaId?: string; instalacionId?: { in: string[] } }> {
  if (dePersona(ctx)) return { personaId: (await personaPropia(ctx)).id };
  if (!ctx.autorizar("asistencia:ver")) throw prohibido("Ver marcas exige el permiso asistencia:ver.");
  return ctx.alcance ? { instalacionId: { in: [...ctx.alcance.instalaciones] } } : {};
}