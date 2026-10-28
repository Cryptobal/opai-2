import type { Contexto } from "../src/types";

/** Contrato ficticio completo para fixtures anteriores a la ampliación aditiva del 07b. */
export async function destinoVinculo(ctx: Contexto) {
  let i = await ctx.db.instalacion.findFirst({ where: { archivadaEn: null } });
  if (!i) {
    const cuenta = await ctx.db.cuenta.create({
      data: { tenantId: ctx.tenantId, nombre: "Cuenta de prueba" },
    });
    i = await ctx.db.instalacion.create({
      data: { tenantId: ctx.tenantId, cuentaId: cuenta.id, nombre: "Instalación de prueba" },
    });
  }
  return { instalacionId: i.id, horasSemanales: 40, distribucion: "Lunes a viernes" };
}
