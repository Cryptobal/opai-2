import { RETENCION_CONSUMOS_DIAS } from "@opai/db";

import type { Contexto } from "../types";

export type GrupoConsumo = {
  recurso: string;
  modulo: string;
  apiKeyId: string | null;
  cantidad: number;
  costoMicro: number;
};

/** "aaaa-mm" → [inicio, fin) del mes en UTC; por defecto el mes actual. */
export function rangoMes(mes?: string, ahora = new Date()) {
  const [a, m] = mes
    ? (mes.split("-").map(Number) as [number, number])
    : [ahora.getUTCFullYear(), ahora.getUTCMonth() + 1];
  return { desde: new Date(Date.UTC(a, m - 1, 1)), hasta: new Date(Date.UTC(a, m, 1)) };
}

/**
 * Consumos de un mes agrupados por recurso, módulo y API key. Los meses dentro de la retención
 * se leen de las filas crudas (incluyen hoy); los anteriores, de `consumos_diarios`, porque las
 * filas crudas ya se purgaron. Un mes que empezó antes del corte terminó hace más de 60 días y
 * está consolidado completo.
 */
export async function consumosDelMes(
  ctx: Contexto,
  mes: string | undefined,
  filtro: { recurso?: string } = {},
): Promise<{ desde: Date; grupos: GrupoConsumo[] }> {
  const { desde, hasta } = rangoMes(mes);
  const corte = Date.now() - RETENCION_CONSUMOS_DIAS * 86_400_000;
  const recurso = filtro.recurso ? { recurso: filtro.recurso } : {};
  if (desde.getTime() >= corte) {
    const g = await ctx.db.consumo.groupBy({
      by: ["recurso", "modulo", "apiKeyId"],
      where: { createdAt: { gte: desde, lt: hasta }, ...recurso },
      _sum: { cantidad: true, costoTotalMicro: true },
    });
    return {
      desde,
      grupos: g.map((x) => ({
        recurso: x.recurso,
        modulo: x.modulo,
        apiKeyId: x.apiKeyId,
        cantidad: x._sum.cantidad ?? 0,
        costoMicro: x._sum.costoTotalMicro ?? 0,
      })),
    };
  }
  const g = await ctx.db.consumoDiario.groupBy({
    by: ["recurso", "modulo", "apiKeyId"],
    where: { dia: { gte: desde, lt: hasta }, ...recurso },
    _sum: { cantidad: true, costoTotalMicro: true },
  });
  return {
    desde,
    grupos: g.map((x) => ({
      recurso: x.recurso,
      modulo: x.modulo,
      apiKeyId: x.apiKeyId === "" ? null : x.apiKeyId,
      cantidad: x._sum.cantidad ?? 0,
      costoMicro: Number(x._sum.costoTotalMicro ?? 0),
    })),
  };
}

/** Suma por una clave (recurso, módulo o key) y ordena por costo y cantidad. */
export function sumarPor(grupos: GrupoConsumo[], clave: (g: GrupoConsumo) => string) {
  const acc = new Map<string, { cantidad: number; costoMicro: number }>();
  for (const g of grupos) {
    const k = clave(g);
    const v = acc.get(k) ?? { cantidad: 0, costoMicro: 0 };
    acc.set(k, { cantidad: v.cantidad + g.cantidad, costoMicro: v.costoMicro + g.costoMicro });
  }
  return [...acc.entries()]
    .map(([k, v]) => ({ clave: k, ...v }))
    .sort((a, b) => b.costoMicro - a.costoMicro || b.cantidad - a.cantidad);
}
