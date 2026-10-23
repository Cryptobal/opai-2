import { microAUsd } from "@opai/domain";

import type { TenantDb } from "@opai/db";

export const inicioDeMes = (d = new Date()) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));

/** Consumo del mes de una empresa: IA (USD), correos, llamadas y última actividad. */
export async function metricasDelMes(db: TenantDb) {
  const [g, ultimo] = await Promise.all([
    db.consumo.groupBy({
      by: ["recurso"],
      where: { createdAt: { gte: inicioDeMes() } },
      _sum: { cantidad: true, costoTotalMicro: true },
    }),
    db.consumo.findFirst({
      where: { recurso: "capacidad.ejecucion" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);
  const suma = (pref: string, k: "cantidad" | "costoTotalMicro") =>
    g.filter((x) => x.recurso.startsWith(pref)).reduce((s, x) => s + (x._sum[k] ?? 0), 0);
  return {
    iaUsd: microAUsd(suma("ia.", "costoTotalMicro")),
    iaTokens: suma("ia.", "cantidad"),
    correos: suma("correo.", "cantidad"),
    llamadas: suma("capacidad.ejecucion", "cantidad"),
    costoUsd: microAUsd(g.reduce((s, x) => s + (x._sum.costoTotalMicro ?? 0), 0)),
    ultimoAcceso: ultimo?.createdAt.toISOString() ?? null,
  };
}

/**
 * `Promise.all` con concurrencia acotada: las listas de plataforma abren una transacción por
 * empresa y el pool en serverless es chico (connection_limit=5).
 */
export async function porLotes<T, R>(items: readonly T[], f: (x: T) => Promise<R>, lote = 3) {
  const r: R[] = [];
  for (let i = 0; i < items.length; i += lote)
    r.push(...(await Promise.all(items.slice(i, i + lote).map(f))));
  return r;
}
