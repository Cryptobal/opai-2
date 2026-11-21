import type { Contexto } from "@opai/capabilities";

/**
 * Nombres para mostrar en la cola y la ficha (CAR-472). Una sola consulta por tabla; los ids ya
 * vienen de filas visibles para quien consulta (alcance aplicado antes), así que no revelan nada nuevo.
 */
export async function nombresInstalaciones(ctx: Contexto, ids: string[]): Promise<Map<string, string>> {
  const unicos = [...new Set(ids)];
  if (!unicos.length) return new Map();
  const filas = await ctx.db.instalacion.findMany({ where: { id: { in: unicos } }, select: { id: true, nombre: true } });
  return new Map(filas.map((f) => [f.id, f.nombre]));
}

export async function nombrePersona(ctx: Contexto, id: string | null): Promise<string | null> {
  if (!id) return null;
  const p = await ctx.db.persona.findFirst({ where: { id }, select: { nombres: true, apellidos: true } });
  return p ? `${p.nombres} ${p.apellidos}`.trim() : null;
}

export async function nombreInstalacion(ctx: Contexto, id: string): Promise<string | null> {
  return (await nombresInstalaciones(ctx, [id])).get(id) ?? null;
}
