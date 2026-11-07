import type { Contexto } from "@opai/capabilities";

/**
 * Carga en una versión en borrador los costos predefinidos de la empresa (CAR-213), sin pisar lo que ya
 * hay: un costo `global` una sola vez y uno `por_puesto` en cada puesto que aún no tiene esa categoría.
 * Idempotente. Sin predefinidos activos no hace nada. Devuelve cuántos costos creó.
 * `lineaIds` limita los puestos alcanzados (p. ej. los recién creados).
 */
export async function aplicarCostosPredefinidos(
  ctx: Contexto,
  versionId: string,
  opciones?: { lineaIds?: readonly string[] },
): Promise<number> {
  const predefinidos = await ctx.db.cpqCostoPredefinido.findMany({
    where: { activo: true },
    orderBy: [{ orden: "asc" }, { categoria: "asc" }],
  });
  if (!predefinidos.length) return 0;
  const existentes = await ctx.db.cpqCostoCategoria.findMany({ where: { versionId }, select: { lineaId: true, categoria: true } });
  const clave = (lineaId: string | null, categoria: string) => `${lineaId ?? "global"}:${categoria}`;
  const hay = new Set(existentes.map((c) => clave(c.lineaId, c.categoria)));
  const secciones = await ctx.db.cpqSeccion.findMany({ where: { versionId }, select: { id: true } });
  const puestos = await ctx.db.cpqLinea.findMany({
    where: { seccionId: { in: secciones.map((s) => s.id) }, tipo: "puesto", ...(opciones?.lineaIds ? { id: { in: [...opciones.lineaIds] } } : {}) },
    select: { id: true },
  });
  const nuevos: { tenantId: string; versionId: string; lineaId: string | null; categoria: string; montoClp: number }[] = [];
  for (const p of predefinidos) {
    const blancos = p.alcance === "global" ? (opciones?.lineaIds ? [] : [null]) : puestos.map((x) => x.id);
    for (const lineaId of blancos) {
      if (hay.has(clave(lineaId, p.categoria))) continue;
      nuevos.push({ tenantId: ctx.tenantId, versionId, lineaId, categoria: p.categoria, montoClp: p.montoClp });
    }
  }
  if (nuevos.length) await ctx.db.cpqCostoCategoria.createMany({ data: nuevos });
  return nuevos.length;
}
