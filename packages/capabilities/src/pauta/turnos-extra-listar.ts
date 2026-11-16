import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { dondePuesto } from "../core/maestros/alcance";
import { cursorDe, listaSchema, pagina } from "../core/maestros/comun";
import { defineCapability } from "../define";
import { aFechaDb, diaSchema, PERMISO_READ } from "./comun";
import { turnoExtraSchema, vistaTurnoExtra } from "./turnos-extra-comun";

/** Lista turnos extra del alcance (CAR-96). Lectura auditada por IDs. */
export const turnosExtraListar = defineCapability({
  id: "pauta.turnos_extra.listar",
  descripcion:
    "Lista turnos extra de la pauta (por aprobar, aprobados o rechazados) filtrados por estado, instalación, puesto o rango de fechas. Solo muestra puestos del alcance de quien consulta. No revela montos al portal del cliente.",
  permiso: PERMISO_READ,
  input: z.object({
    estado: z.enum(["por_aprobar", "aprobado", "rechazado"]).optional(),
    instalacionId: uuidSchema.optional(),
    puestoId: uuidSchema.optional(),
    desde: diaSchema.optional(),
    hasta: diaSchema.optional(),
    cursor: listaSchema.shape.cursor,
    limite: z.number().int().min(1).max(100).default(50),
  }),
  output: z.object({ items: z.array(turnoExtraSchema), siguiente: z.string().nullable() }),
  auditarLectura: (s) => s.items.map((i) => i.id),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const puestos = await ctx.db.puesto.findMany({
      where: {
        estado: "activo",
        AND: [dondePuesto(ctx)],
        ...(input.instalacionId ? { instalacionId: input.instalacionId } : {}),
        ...(input.puestoId ? { id: input.puestoId } : {}),
      },
      select: { id: true },
    });
    const puestoIds = puestos.map((p) => p.id);
    if (puestoIds.length === 0) return { items: [], siguiente: null };
    const filas = await ctx.db.turnoExtra.findMany({
      where: {
        puestoId: { in: puestoIds },
        ...(input.estado ? { estado: input.estado } : {}),
        ...(input.desde || input.hasta
          ? {
              fecha: {
                ...(input.desde ? { gte: aFechaDb(input.desde) } : {}),
                ...(input.hasta ? { lte: aFechaDb(input.hasta) } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ fecha: "desc" }, { id: "desc" }],
      ...cursorDe(input.cursor, input.limite),
    });
    const { items, siguiente } = pagina(filas, input.limite, input.cursor);
    return { items: items.map(vistaTurnoExtra), siguiente };
  },
});
