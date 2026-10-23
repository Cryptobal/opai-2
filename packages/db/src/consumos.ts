import { forTenant } from "./for-tenant";

const DIA_MS = 86_400_000;
/** Las filas crudas de consumo se conservan 90 días; lo consolidado, siempre (ADR-031). */
export const RETENCION_CONSUMOS_DIAS = 90;

/**
 * Consolida los consumos de un día (UTC, "aaaa-mm-dd") en `consumos_diarios` por recurso, módulo
 * y API key, y purga las filas crudas más antiguas que la retención. Idempotente.
 */
export async function consolidarConsumos(
  tenantId: string,
  dia: string,
): Promise<{ grupos: number; purgadas: number }> {
  const db = forTenant(tenantId);
  const desde = new Date(`${dia}T00:00:00.000Z`);
  const hasta = new Date(desde.getTime() + DIA_MS);
  const grupos = await db.consumo.groupBy({
    by: ["recurso", "modulo", "apiKeyId"],
    where: { createdAt: { gte: desde, lt: hasta } },
    _sum: { cantidad: true, costoTotalMicro: true },
  });
  for (const g of grupos) {
    const clave = {
      tenantId,
      dia: desde,
      recurso: g.recurso,
      modulo: g.modulo,
      apiKeyId: g.apiKeyId ?? "",
    };
    const valores = {
      cantidad: g._sum.cantidad ?? 0,
      costoTotalMicro: g._sum.costoTotalMicro ?? 0,
    };
    await db.consumoDiario.upsert({
      where: { tenantId_dia_recurso_modulo_apiKeyId: clave },
      create: { ...clave, ...valores },
      update: valores,
    });
  }
  const limite = new Date(Date.now() - RETENCION_CONSUMOS_DIAS * DIA_MS);
  const { count } = await db.consumo.deleteMany({ where: { createdAt: { lt: limite } } });
  return { grupos: grupos.length, purgadas: count };
}
