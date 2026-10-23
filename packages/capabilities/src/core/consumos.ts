import { z } from "zod";

import { microAUsd, PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../define";

/** "aaaa-mm" → [inicio, fin) del mes en UTC; por defecto el mes actual. */
export function rangoMes(mes?: string) {
  const ahora = new Date();
  const [a, m] = mes
    ? (mes.split("-").map(Number) as [number, number])
    : [ahora.getUTCFullYear(), ahora.getUTCMonth() + 1];
  return { desde: new Date(Date.UTC(a, m - 1, 1)), hasta: new Date(Date.UTC(a, m, 1)) };
}

const mesSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Formato aaaa-mm.")
  .optional()
  .describe("Mes en formato aaaa-mm. Por defecto, el mes en curso.");

const filaSchema = z.object({
  clave: z.string(),
  cantidad: z.number(),
  costoMicro: z.number(),
  costoUsd: z.number(),
});

function filas(grupos: { clave: string; cantidad: number; costoMicro: number }[]) {
  return grupos
    .map((g) => ({ ...g, costoUsd: microAUsd(g.costoMicro) }))
    .sort((a, b) => b.costoMicro - a.costoMicro || b.cantidad - a.cantidad);
}

export const consumosResumen = defineCapability({
  id: "core.consumos.resumen",
  descripcion:
    "Consumos de la empresa en un mes (ADR-031): total en USD y, por recurso (IA, correo, mapas, almacenamiento, ejecuciones), cantidad y costo.",
  permiso: PERMISOS_CORE.consumosRead,
  input: z.object({ mes: mesSchema }),
  output: z.object({ mes: z.string(), totalUsd: z.number(), porRecurso: z.array(filaSchema) }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const { desde, hasta } = rangoMes(input.mes);
    const grupos = await ctx.db.consumo.groupBy({
      by: ["recurso"],
      where: { createdAt: { gte: desde, lt: hasta } },
      _sum: { cantidad: true, costoTotalMicro: true },
    });
    const porRecurso = filas(
      grupos.map((g) => ({
        clave: g.recurso,
        cantidad: g._sum.cantidad ?? 0,
        costoMicro: g._sum.costoTotalMicro ?? 0,
      })),
    );
    const total = porRecurso.reduce((t, f) => t + f.costoMicro, 0);
    return { mes: desde.toISOString().slice(0, 7), totalUsd: microAUsd(total), porRecurso };
  },
});

export const consumosPorAgente = defineCapability({
  id: "core.consumos.por_agente",
  descripcion:
    "Consumos del mes por agente (API key): ejecuciones y costo en USD de cada key, para controlar presupuestos (ADR-032).",
  permiso: PERMISOS_CORE.consumosRead,
  input: z.object({ mes: mesSchema }),
  output: z.array(
    z.object({
      apiKeyId: z.string(),
      nombre: z.string(),
      ejecuciones: z.number(),
      costoUsd: z.number(),
    }),
  ),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const { desde, hasta } = rangoMes(input.mes);
    const where = { createdAt: { gte: desde, lt: hasta }, apiKeyId: { not: null } };
    const [grupos, keys] = await Promise.all([
      ctx.db.consumo.groupBy({
        by: ["apiKeyId", "recurso"],
        where,
        _sum: { cantidad: true, costoTotalMicro: true },
      }),
      ctx.db.apiKey.findMany({ select: { id: true, nombre: true } }),
    ]);
    const nombres = new Map(keys.map((k) => [k.id, k.nombre]));
    const porKey = new Map<string, { ejecuciones: number; costo: number }>();
    for (const g of grupos) {
      const id = g.apiKeyId ?? "";
      const acc = porKey.get(id) ?? { ejecuciones: 0, costo: 0 };
      if (g.recurso === "capacidad.ejecucion") acc.ejecuciones += g._sum.cantidad ?? 0;
      acc.costo += g._sum.costoTotalMicro ?? 0;
      porKey.set(id, acc);
    }
    return [...porKey.entries()].map(([apiKeyId, v]) => ({
      apiKeyId,
      nombre: nombres.get(apiKeyId) ?? "Key eliminada",
      ejecuciones: v.ejecuciones,
      costoUsd: microAUsd(v.costo),
    }));
  },
});
