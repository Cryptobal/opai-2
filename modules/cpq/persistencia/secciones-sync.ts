import type { Contexto } from "@opai/capabilities";

/** Una sección por instalación del negocio más «Común» (R18–R19). Idempotente. */
export async function sincronizarSecciones(ctx: Contexto, versionId: string, negocioId: string) {
  const vinculos = await ctx.db.negocioInstalacion.findMany({
    where: { negocioId },
    include: { instalacion: { select: { id: true, nombre: true } } },
  });
  const actuales = await ctx.db.cpqSeccion.findMany({ where: { versionId }, orderBy: [{ orden: "asc" }] });
  let orden = actuales.reduce((m, s) => Math.max(m, s.orden), -1) + 1;
  for (const v of vinculos) {
    if (actuales.some((s) => s.instalacionId === v.instalacionId)) continue;
    await ctx.db.cpqSeccion.create({
      data: {
        tenantId: ctx.tenantId,
        versionId,
        instalacionId: v.instalacionId,
        nombre: v.instalacion.nombre,
        orden: orden++,
      },
    });
  }
  if (!actuales.some((s) => s.instalacionId === null)) {
    await ctx.db.cpqSeccion.create({
      data: { tenantId: ctx.tenantId, versionId, instalacionId: null, nombre: "Común", orden },
    });
  }
  return ctx.db.cpqSeccion.findMany({
    where: { versionId },
    orderBy: [{ orden: "asc" }, { id: "asc" }],
  });
}
