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
