import { z } from "zod";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { cursorDe, pagina } from "../maestros/comun";
import { filtrarVisibles } from "./actividades-alcance";
import { PERMISO_READ, actividadSchema, conRelaciones } from "./actividades-comun";
import { conNombres, nombresActividadSchema } from "./actividades-nombres";
import { ENTIDADES_ACTIVIDAD, TIPOS_ACTIVIDAD, exigirEntidad, refDe } from "./comun";

const salida = z.object({
  items: z.array(actividadSchema.extend(nombresActividadSchema)),
  siguiente: z.string().nullable(),
});
const entidad = z.object({ tipo: z.enum(ENTIDADES_ACTIVIDAD), id: uuidSchema });

/** Ids de actividades ligadas a una entidad (ya validada en el alcance del actor). */
async function ligadasA(ctx: Parameters<typeof exigirEntidad>[0], e: z.infer<typeof entidad>) {
  await exigirEntidad(ctx, e.tipo, e.id);
  const ref = Object.fromEntries(
    Object.entries(refDe(e.tipo, e.id)).filter(([, v]) => v !== null),
  );
  const v = await ctx.db.actividadVinculo.findMany({ where: ref, select: { actividadId: true } });
  return v.map((x) => x.actividadId);
}
const paginacion = {
  cursor: z.uuid().optional().describe("Id de la última fila de la página anterior."),
  limite: z.number().int().min(1).max(100).default(30),
};

export const actividadesTimeline = defineCapability({
  auditarLectura: (s) => s.items.map((a) => a.id),
  id: "core.actividades.timeline",
  descripcion:
    "Línea de tiempo de una entidad (negocio, cuenta, contacto o instalación): sus notas, llamadas, reuniones y tareas, de la más reciente a la más antigua.",
  permiso: PERMISO_READ,
  portales: ["erp"],
  input: z.object({
    entidadTipo: z.enum(ENTIDADES_ACTIVIDAD),
    entidadId: uuidSchema,
    tipos: z.array(z.enum(TIPOS_ACTIVIDAD)).optional(),
    ...paginacion,
  }),
  output: salida,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const ligadas = await ligadasA(ctx, { tipo: input.entidadTipo, id: input.entidadId });
    const filas = await ctx.db.actividad.findMany({
      where: {
        id: { in: await filtrarVisibles(ctx, ligadas) },
        ...(input.tipos ? { tipo: { in: input.tipos } } : {}),
      },
      orderBy: [{ ocurrioEn: "desc" }, { id: "desc" }],
      take: input.limite + 1,
      ...cursorDe(input.cursor),
    });
    const p = pagina(filas, input.limite);
    return {
      items: await conNombres(ctx, await conRelaciones(ctx, p.items)),
      siguiente: p.siguiente,
    };
  },
});

export const actividadesTareas = defineCapability({
  auditarLectura: (s) => s.items.map((a) => a.id),
  id: "core.actividades.tareas",
  descripcion:
    "Tareas asignadas a un usuario (por defecto, quien consulta), de todo el equipo visible o ligadas a una ficha (negocio, cuenta, contacto o instalación); pendientes por defecto, ordenadas por vencimiento.",
  permiso: PERMISO_READ,
  portales: ["erp"],
  input: z.object({
    responsableId: uuidSchema.optional(),
    equipo: z
      .boolean()
      .default(false)
      .describe("Todas las tareas que el actor puede ver, de cualquier responsable."),
    entidad: entidad.optional().describe("Solo las tareas ligadas a esta ficha, de cualquier responsable."),
    estado: z.enum(["pendiente", "hecha", "cancelada"]).default("pendiente"),
    ...paginacion,
  }),
  output: salida,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const usuarioId = input.responsableId ?? ctx.usuario?.id;
    // Por ficha o por responsable; «equipo» sin acotar por responsable. Siempre con la visibilidad
    // del actor (ADR-022): propias, de su equipo o todas.
    const candidatas = input.entidad
      ? await ligadasA(ctx, input.entidad)
      : input.equipo && !input.responsableId
        ? null
        : usuarioId
          ? (
              await ctx.db.actividadResponsable.findMany({
                where: { usuarioId },
                select: { actividadId: true },
              })
            ).map((r) => r.actividadId)
          : [];
    const ids =
      candidatas ??
      (
        await ctx.db.actividad.findMany({
          where: { tipo: "tarea", estado: input.estado },
          select: { id: true },
          take: 2000,
        })
      ).map((a) => a.id);
    const filas = await ctx.db.actividad.findMany({
      where: {
        id: { in: await filtrarVisibles(ctx, ids) },
        tipo: "tarea",
        estado: input.estado,
      },
      orderBy: [{ vencimiento: "asc" }, { id: "asc" }],
      take: input.limite + 1,
      ...cursorDe(input.cursor),
    });
    const p = pagina(filas, input.limite);
    return {
      items: await conNombres(ctx, await conRelaciones(ctx, p.items)),
      siguiente: p.siguiente,
    };
  },
});
