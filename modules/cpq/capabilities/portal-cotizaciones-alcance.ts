import type { Contexto } from "@opai/capabilities";

/**
 * Filtro por alcance (CAR-300): un acceso «completo» no se restringe; uno «limitado» (prospecto) solo ve las
 * cotizaciones de sus propuestas vigentes (`portal_cliente.acceso_propuestas`). Se aplica en la consulta (ADR-022).
 */
export async function soloVigentes(ctx: Contexto, alcance: "completo" | "limitado", accesoId: string) {
  if (alcance !== "limitado") return {};
  const filas = await ctx.db.accesoPropuesta.findMany({ where: { accesoId, estado: "vigente" }, select: { cotizacionId: true } });
  return { AND: [{ id: { in: filas.map((f) => f.cotizacionId) } }] };
}
