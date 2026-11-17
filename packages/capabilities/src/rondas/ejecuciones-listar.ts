import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { cursorDe, diaSchema, listaSchema, pagina } from "../core/maestros/comun";
import { defineCapability } from "../define";
import { dondeInstalacionId, instalacionEnAlcance, PERMISO_READ } from "./comun";
import {
  derivarEstado,
  ejecucionResumenSchema,
  estadoEjecucionSchema,
  iso,
  type EstadoEjecucion,
} from "./ejecuciones-comun";
import type { Contexto } from "../types";
import { slotsNoRealizados } from "./programacion-slots";

const seleccion = {
  id: true,
  instalacionId: true,
  plantillaId: true,
  adhoc: true,
  horaInicio: true,
  plantilla: { select: { nombre: true, tiempoMaxMin: true, puntos: { where: { obligatorio: true }, select: { id: true } } } },
  cierre: {
    select: {
      estado: true,
      horaCierre: true,
      puntosMarcados: true,
      puntosObligatorios: true,
      motivo: true,
    },
  },
  marcas: { select: { anomalias: true } },
} as const;

type Fila = {
  id: string;
  instalacionId: string;
  plantillaId: string;
  adhoc: boolean;
  horaInicio: Date;
  plantilla: { nombre: string; tiempoMaxMin: number; puntos: { id: string }[] };
  cierre: {
    estado: string;
    horaCierre: Date;
    puntosMarcados: number;
    puntosObligatorios: number;
    motivo: string | null;
  } | null;
  marcas: { anomalias: string[] }[];
};

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
  }) as Promise<Fila[]>;
}

function resumir(e: Fila, ahora: Date): z.input<typeof ejecucionResumenSchema> {
  const oblig = e.cierre?.puntosObligatorios ?? e.plantilla.puntos.length;
  const anomalias = e.marcas.reduce((n, m) => n + m.anomalias.length, 0);
  const estado = derivarEstado(e.cierre, e.horaInicio, e.plantilla.tiempoMaxMin, ahora);
  return {
    id: e.id,
    instalacionId: e.instalacionId,
    plantillaId: e.plantillaId,
    plantillaNombre: e.plantilla.nombre,
    adhoc: e.adhoc,
    estado,
    horaInicio: iso(e.horaInicio),
    horaCierre: e.cierre ? iso(e.cierre.horaCierre) : null,
    puntosMarcados: e.cierre?.puntosMarcados ?? e.marcas.length,
    puntosObligatorios: oblig,
    anomalias,
  };
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
    let items = pag.map((e) => resumir(e, ahora));
    if (input.estado) items = items.filter((i) => i.estado === input.estado);
    return { items, siguiente };
  },
});