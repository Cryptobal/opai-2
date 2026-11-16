import { z } from "zod";

import { ESTADOS_TURNO_EXTRA } from "@opai/domain";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { reglaDeNegocio } from "../errores";
import { aFechaDb, diaSchema, PERMISO_READ } from "./comun";
import { dondeTurnoExtra, turnoExtraSchema, vistaTurnoExtra } from "./turnos-extra-comun";

/** Turnos extra, del más reciente al más antiguo (CAR-96). Contrato de listas (CAR-353). */
export const turnosExtraListar = defineCapability({
  // Montos y motivos de turnos de personas: se audita qué turnos se revelaron (solo IDs).
  auditarLectura: (s) => s.items.map((t) => t.id),
  id: "pauta.turnos_extra.listar",
  descripcion:
    "Lista los turnos extra, del más reciente al más antiguo, con su persona, puesto, tipo de trabajador (propio o externo), monto sugerido y final, y estado (por aprobar, aprobado o rechazado). Se filtra por estado, instalación o rango de fechas. Solo instalaciones dentro del alcance de quien consulta.",
  permiso: PERMISO_READ,
  input: z.object({
    estado: z.enum(ESTADOS_TURNO_EXTRA).optional(),
    instalacionId: uuidSchema.optional(),
    desde: diaSchema.optional(),
    hasta: diaSchema.optional(),
    cursor: z.string().optional().describe("El `siguiente` de la página anterior."),
    limite: z.number().int().min(1).max(100).default(50),
  }),
  output: z.object({ items: z.array(turnoExtraSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { estado, instalacionId, desde, hasta, cursor, limite }) {
    if (cursor && !uuidSchema.safeParse(cursor).success) throw reglaDeNegocio("El cursor no es válido.");
    if (desde && hasta && hasta < desde) throw reglaDeNegocio("«hasta» no puede ser anterior a «desde».");
    const filas = await ctx.db.turnoExtra.findMany({
      where: {
        AND: [dondeTurnoExtra(ctx)],
        ...(estado ? { estado } : {}),
        ...(instalacionId ? { instalacionId } : {}),
        ...(desde || hasta ? { fecha: { ...(desde ? { gte: aFechaDb(desde) } : {}), ...(hasta ? { lte: aFechaDb(hasta) } : {}) } } : {}),
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      orderBy: { id: "desc" },
      take: limite + 1,
    });
    const pagina = filas.slice(0, limite);
    return { items: pagina.map(vistaTurnoExtra), siguiente: filas.length > limite ? (pagina.at(-1)?.id ?? null) : null };
  },
});
