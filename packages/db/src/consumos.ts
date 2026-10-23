import { forTenant } from "./for-tenant";

const DIA_MS = 86_400_000;
/** Las filas crudas de consumo se conservan 90 días; lo consolidado, siempre (ADR-031). */
export const RETENCION_CONSUMOS_DIAS = 90;
/** Días atrasados que una corrida consolida antes de purgar (si el cron estuvo caído). */
const MAX_DIAS_POR_CORRIDA = 31;

const diaUtc = (d: Date) => d.toISOString().slice(0, 10);

/** Upsert de los totales de un día UTC ("aaaa-mm-dd") por recurso, módulo y API key. */
async function consolidarDia(tenantId: string, dia: string): Promise<number> {
  const db = forTenant(tenantId);
  const desde = new Date(`${dia}T00:00:00.000Z`);
  const grupos = await db.consumo.groupBy({
    by: ["recurso", "modulo", "apiKeyId"],
    where: { createdAt: { gte: desde, lt: new Date(desde.getTime() + DIA_MS) } },
    _sum: { cantidad: true, costoTotalMicro: true },
  });
  for (const g of grupos) {
    const clave = { tenantId, dia: desde, recurso: g.recurso, modulo: g.modulo };
    const valores = {
      cantidad: g._sum.cantidad ?? 0,
      costoTotalMicro: BigInt(g._sum.costoTotalMicro ?? 0),
    };
    await db.consumoDiario.upsert({
      where: { tenantId_dia_recurso_modulo_apiKeyId: { ...clave, apiKeyId: g.apiKeyId ?? "" } },
      create: { ...clave, apiKeyId: g.apiKeyId ?? "", ...valores },
      update: valores,
    });
  }
  return grupos.length;
}

/**
 * Consolida los consumos de `dia` en `consumos_diarios` y purga las filas crudas fuera de la
 * retención. Antes de purgar consolida cada día que se va a borrar (si el cron faltó, no se
 * pierde nada) y el corte es a día completo, para que reconsolidar nunca vea un día a medias.
 * Idempotente.
 */
export async function consolidarConsumos(
  tenantId: string,
  dia: string,
  ahora = new Date(),
): Promise<{ grupos: number; purgadas: number }> {
  const db = forTenant(tenantId);
  const grupos = await consolidarDia(tenantId, dia);
  const corte = new Date(
    `${diaUtc(new Date(ahora.getTime() - RETENCION_CONSUMOS_DIAS * DIA_MS))}T00:00:00.000Z`,
  );
  const masAntigua = await db.consumo.findFirst({
    where: { createdAt: { lt: corte } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });
  if (!masAntigua) return { grupos, purgadas: 0 };
  let cursor = new Date(`${diaUtc(masAntigua.createdAt)}T00:00:00.000Z`);
  for (let n = 0; n < MAX_DIAS_POR_CORRIDA && cursor < corte; n++) {
    await consolidarDia(tenantId, diaUtc(cursor));
    cursor = new Date(cursor.getTime() + DIA_MS);
  }
  // Solo se borra hasta donde se consolidó en esta corrida.
  const hasta = cursor < corte ? cursor : corte;
  const { count } = await db.consumo.deleteMany({ where: { createdAt: { lt: hasta } } });
  return { grupos, purgadas: count };
}
