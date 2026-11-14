import { z } from "zod";

import { defineCapability } from "../define";
import { mesAnterior } from "./cierre";
import { mesesDe, PERMISOS_DESEMPENO } from "./comun";

export const periodosList = defineCapability({
  id: "desempeno.periodos.list",
  descripcion:
    "Meses cerrados de Desempeño, del más reciente al más antiguo: cuándo y cómo se cerró cada uno (a mano o automático) y cuántas personas quedaron con resultado guardado. También dice si el mes anterior todavía está abierto y qué meses ya terminados siguen sin cerrar (desde el primer scorecard publicado), para cerrarlos.",
  permiso: PERMISOS_DESEMPENO.scorecardsRead,
  input: z.object({}),
  output: z.object({
    cerrados: z.array(
      z.object({
        periodo: z.string(),
        origen: z.enum(["manual", "automatico"]),
        cerradoEn: z.string(),
        personas: z.number().int(),
      }),
    ),
    porCerrar: z
      .string()
      .nullable()
      .describe("El mes anterior (aaaa-mm) si todavía no está cerrado; null si ya lo está."),
    abiertos: z
      .array(z.string())
      .describe(
        "Meses ya terminados sin cerrar, del más reciente al más antiguo (máximo 12), desde el primer scorecard publicado. Vacío con alcance acotado (cerrar es de toda la empresa).",
      ),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const [filas, meses, primero] = await Promise.all([
      ctx.db.desempenoPeriodoCerrado.findMany({ orderBy: { periodo: "desc" }, take: 60 }),
      mesesDe(ctx),
      ctx.db.desempenoScorecard.findFirst({
        where: { estado: "publicado" },
        orderBy: { vigenteDesde: "asc" },
        select: { vigenteDesde: true },
      }),
    ]);
    const anterior = mesAnterior(meses.actual);
    // Los meses abiertos se buscan en los últimos 12, sin depender del tope de la lista.
    let desde = anterior;
    for (let i = 0; i < 11; i++) desde = mesAnterior(desde);
    const recientes = await ctx.db.desempenoPeriodoCerrado.findMany({
      where: { periodo: { gte: desde } },
      select: { periodo: true },
    });
    const cerrados = new Set(recientes.map((f) => f.periodo));
    const abiertos: string[] = [];
    if (ctx.alcance === null && primero)
      for (let m = anterior; m >= primero.vigenteDesde && abiertos.length < 12; m = mesAnterior(m))
        if (!cerrados.has(m)) abiertos.push(m);
    return {
      cerrados: filas.map((f) => ({
        periodo: f.periodo,
        origen: f.origen === "manual" ? ("manual" as const) : ("automatico" as const),
        cerradoEn: f.createdAt.toISOString(),
        personas: f.personas,
      })),
      // Solo quien puede cerrar (alcance completo) recibe el mes por cerrar.
      porCerrar: ctx.alcance !== null || cerrados.has(anterior) ? null : anterior,
      abiertos,
    };
  },
});
