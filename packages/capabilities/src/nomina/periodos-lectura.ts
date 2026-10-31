import { z } from "zod";

import { defineCapability } from "../define";
import { PERMISO_READ, periodoSchema } from "./comun";
import { vistaPeriodo } from "./vistas";

/** Lista los períodos de remuneraciones de la empresa, del más reciente al más antiguo. */
export const periodosListar = defineCapability({
  id: "nomina.periodos.listar",
  descripcion:
    "Lista los períodos de remuneraciones de la empresa con su estado (abierto, en revisión, cerrado o pagado), sus fechas, el cierre previsto y cuántas novedades vigentes tiene cada uno.",
  permiso: PERMISO_READ,
  input: z.object({ anio: z.number().int().min(2000).max(2100).optional() }),
  output: z.array(periodoSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const periodos = await ctx.db.nominaPeriodo.findMany({
      where: input.anio ? { anio: input.anio } : {},
      orderBy: [{ anio: "desc" }, { mes: "desc" }],
    });
    const cuentas = await ctx.db.nominaNovedad.groupBy({
      by: ["periodoId"],
      where: { estado: "vigente" },
      _count: { _all: true },
    });
    const porPeriodo = new Map(cuentas.map((c) => [c.periodoId, c._count._all]));
    return periodos.map((p) => vistaPeriodo(p, porPeriodo.get(p.id) ?? 0));
  },
});
