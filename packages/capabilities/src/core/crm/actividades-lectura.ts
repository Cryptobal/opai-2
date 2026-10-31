import { z } from "zod";

import { defineCapability } from "../../define";
import { uuidSchema } from "../esquemas";
import { cursorDe, pagina } from "../maestros/comun";
import { filtrarVisibles } from "./actividades-alcance";
import { PERMISO_READ, actividadSchema, conRelaciones } from "./actividades-comun";
import { ENTIDADES_ACTIVIDAD, TIPOS_ACTIVIDAD, exigirEntidad, refDe } from "./comun";

const salida = z.object({ items: z.array(actividadSchema), siguiente: z.string().nullable() });
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
    await exigirEntidad(ctx, input.entidadTipo, input.entidadId);
    const ref = Object.fromEntries(
      Object.entries(refDe(input.entidadTipo, input.entidadId)).filter(([, v]) => v !== null),
    );
    const vinculos = await ctx.db.actividadVinculo.findMany({
      where: ref,
      select: { actividadId: true },
    });
    const filas = await ctx.db.actividad.findMany({
      where: {
        id: {
          in: await filtrarVisibles(
            ctx,
            vinculos.map((v) => v.actividadId),
          ),
        },
        ...(input.tipos ? { tipo: { in: input.tipos } } : {}),
      },
      orderBy: [{ ocurrioEn: "desc" }, { id: "desc" }],
      take: input.limite + 1,
      ...cursorDe(input.cursor),
    });
    const p = pagina(filas, input.limite);
    return { items: await conRelaciones(ctx, p.items), siguiente: p.siguiente };
  },
});

export const actividadesTareas = defineCapability({
  auditarLectura: (s) => s.items.map((a) => a.id),
  id: "core.actividades.tareas",
  descripcion:
    "Tareas asignadas a un usuario (por defecto, quien consulta), pendientes por defecto, ordenadas por vencimiento.",
  permiso: PERMISO_READ,
  portales: ["erp"],
  input: z.object({
    responsableId: uuidSchema.optional(),
    estado: z.enum(["pendiente", "hecha", "cancelada"]).default("pendiente"),
    ...paginacion,
  }),
  output: salida,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const usuarioId = input.responsableId ?? ctx.usuario?.id;
    const asignadas = usuarioId
      ? await ctx.db.actividadResponsable.findMany({
          where: { usuarioId },
          select: { actividadId: true },
        })
      : [];
    const filas = await ctx.db.actividad.findMany({
      where: {
        // Propias / equipo / todas (ADR-022): solo las tareas que el actor puede ver.
        id: {
          in: await filtrarVisibles(
            ctx,
            asignadas.map((r) => r.actividadId),
          ),
        },
        tipo: "tarea",
        estado: input.estado,
      },
      orderBy: [{ vencimiento: "asc" }, { id: "asc" }],
      take: input.limite + 1,
      ...cursorDe(input.cursor),
    });
    const p = pagina(filas, input.limite);
    return { items: await conRelaciones(ctx, p.items), siguiente: p.siguiente };
  },
});
