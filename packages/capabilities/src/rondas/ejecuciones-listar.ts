import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { cursorDe, diaSchema, listaSchema, pagina } from "../core/maestros/comun";
import { defineCapability } from "../define";
import { dondeInstalacionId, instalacionEnAlcance, PERMISO_READ } from "./comun";
import { ejecucionResumenSchema, estadoEjecucionSchema, seleccionEjecucionNucleo } from "./ejecuciones-comun";
import { mapearEjecucionResumen, type EjecucionResumenDb } from "./ejecuciones-leer-mapear";
import type { Contexto } from "../types";
import { slotsNoRealizados } from "./programacion-slots";

const seleccion = { ...seleccionEjecucionNucleo, marcas: { select: { anomalias: true } } } as const;

async function filasEjecucion(
  ctx: Contexto,
  input: { instalacionId?: string; desde?: string; hasta?: string; limite: number; cursor?: string },
) {
  const where = {
    ...dondeInstalacionId(ctx),
    ...(input.instalacionId ? { instalacionId: input.instalacionId } : {}),
    ...(input.desde || input.hasta
      ? {
          horaInicio: {
            ...(input.desde ? { gte: new Date(`${input.desde}T00:00:00.000Z`) } : {}),
            ...(input.hasta ? { lt: new Date(`${input.hasta}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
  };
  return ctx.db.ejecucionRonda.findMany({
    where,
    orderBy: [{ horaInicio: "desc" }, { id: "desc" }],
    ...cursorDe(input.cursor, input.limite),
    select: seleccion,
  }) as Promise<EjecucionResumenDb[]>;
}

/** Lista ejecuciones de ronda del alcance, paginada y filtrable por instalación, fechas y estado. */
export const ejecucionesListar = defineCapability({
  id: "rondas.ejecuciones.listar",
  descripcion:
    "Lista rondas realizadas (o programadas y no iniciadas si filtras por «no realizada») por instalación y período, con estado, puntos marcados y cantidad de anomalías. Respeta el alcance del supervisor.",
  permiso: PERMISO_READ,
  input: z.object({
    instalacionId: uuidSchema.optional(),
    desde: diaSchema.optional(),
    hasta: diaSchema.optional(),
    estado: estadoEjecucionSchema.optional(),
    cursor: listaSchema.shape.cursor,
    limite: z.number().int().min(1).max(100).default(50),
  }),
  output: z.object({ items: z.array(ejecucionResumenSchema), siguiente: z.string().nullable() }),
  auditarLectura: (s) => s.items.map((i) => i.id).filter((id) => !id.startsWith("nr:")),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    if (input.instalacionId) await instalacionEnAlcance(ctx, input.instalacionId);
    const ahora = new Date();
    if (input.estado === "no_realizada") {
      const faltantes = await slotsNoRealizados(ctx, {
        ...(input.instalacionId ? { instalacionId: input.instalacionId } : {}),
        ...(input.desde ? { desde: input.desde } : {}),
        ...(input.hasta ? { hasta: input.hasta } : {}),
      });
      const items = faltantes.slice(0, input.limite);
      return { items, siguiente: faltantes.length > input.limite ? items.at(-1)?.id ?? null : null };
    }
    const filas = await filasEjecucion(ctx, {
      limite: input.limite,
      ...(input.instalacionId ? { instalacionId: input.instalacionId } : {}),
      ...(input.desde ? { desde: input.desde } : {}),
      ...(input.hasta ? { hasta: input.hasta } : {}),
      ...(input.cursor ? { cursor: input.cursor } : {}),
    });
    const { items: pag, siguiente } = pagina(filas, input.limite, input.cursor);
    let items = pag.map((e) => mapearEjecucionResumen(e, ahora));
    if (input.estado) items = items.filter((i) => i.estado === input.estado);
    return { items, siguiente };
  },
});