import { z } from "zod";

import { defineCapability } from "../define";
import { mesAnterior } from "./cierre";
import { mesesDe, PERMISOS_DESEMPENO } from "./comun";

export const periodosList = defineCapability({
  id: "desempeno.periodos.list",
  descripcion:
    "Meses cerrados de Desempeño, del más reciente al más antiguo: cuándo y cómo se cerró cada uno (a mano o automático) y cuántas personas quedaron con resultado guardado. También dice si el mes anterior todavía está abierto y se puede cerrar.",
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
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const [filas, meses] = await Promise.all([
      ctx.db.desempenoPeriodoCerrado.findMany({ orderBy: { periodo: "desc" }, take: 60 }),
      mesesDe(ctx),
    ]);
    const anterior = mesAnterior(meses.actual);
    return {
      cerrados: filas.map((f) => ({
        periodo: f.periodo,
        origen: f.origen === "manual" ? ("manual" as const) : ("automatico" as const),
        cerradoEn: f.createdAt.toISOString(),
        personas: f.personas,
      })),
      porCerrar: filas.some((f) => f.periodo === anterior) ? null : anterior,
    };
  },
});
