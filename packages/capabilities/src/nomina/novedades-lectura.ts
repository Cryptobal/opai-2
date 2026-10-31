import { z } from "zod";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { PERMISO_NOVEDADES_READ, periodoDe, tipoNovedadSchema } from "./comun";
import { nombresDe, novedadSchema, vistaNovedad } from "./novedades-vista";

/** Lista las novedades de un período (dato sensible: remuneraciones de personas). */
export const novedadesListar = defineCapability({
  id: "nomina.novedades.listar",
  descripcion:
    "Lista las novedades de un período de remuneraciones (licencias, ausencias, horas extra, anticipos, cuotas de préstamo y descuentos), con la persona, la fecha, la cantidad o el monto y si están vigentes o anuladas. La lectura queda auditada.",
  permiso: PERMISO_NOVEDADES_READ,
  input: z.object({
    periodoId: uuidSchema,
    tipo: tipoNovedadSchema.optional(),
    personaId: uuidSchema.optional(),
    incluirAnuladas: z.boolean().default(false),
    limite: z.number().int().min(1).max(500).default(200),
  }),
  output: z.array(novedadSchema),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (salida) => salida.map((n) => n.id),
  async handler(ctx, input) {
    await periodoDe(ctx, input.periodoId);
    const filas = await ctx.db.nominaNovedad.findMany({
      where: {
        periodoId: input.periodoId,
        ...(input.tipo ? { tipo: input.tipo } : {}),
        ...(input.personaId ? { personaId: input.personaId } : {}),
        ...(input.incluirAnuladas ? {} : { estado: "vigente" }),
      },
      orderBy: [{ fechaDesde: "asc" }, { id: "asc" }],
      take: input.limite,
    });
    const nombres = await nombresDe(ctx.db, filas.map((f) => f.personaId));
    return filas.map((f) => vistaNovedad(f, nombres));
  },
});
