import { z } from "zod";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { textoOpcional } from "../maestros/comun";
import { PERMISO_MANAGE, actividadDe, actividadSchema, conRelaciones } from "./actividades-comun";
import { exigirResponsables } from "./comun";

const fechaHora = z.iso.datetime({ offset: true });

async function vistaDe(ctx: Parameters<typeof actividadDe>[0], id: string) {
  const a = await actividadDe(ctx, id);
  const v = (await conRelaciones(ctx, [a]))[0];
  if (!v) throw reglaDeNegocio("No se pudo leer la actividad.");
  return v;
}

export const actividadesUpdate = defineCapability({
  id: "core.actividades.update",
  descripcion:
    "Edita una actividad (título, detalle, fecha, vencimiento, prioridad, responsables, acuerdos). En una tarea también la cancela o la vuelve a pendiente; completarla es otra acción.",
  permiso: PERMISO_MANAGE,
  input: z.object({
    id: uuidSchema,
    titulo: z.string().trim().min(1).max(200).optional(),
    detalle: textoOpcional(4000),
    ocurrioEn: fechaHora.optional(),
    vencimiento: fechaHora.nullable().optional(),
    todoElDia: z.boolean().optional(),
    prioridad: z.enum(["alta", "media", "baja"]).optional(),
    estado: z.enum(["pendiente", "cancelada"]).optional(),
    responsables: z.array(z.uuid()).min(1).max(10).optional(),
    asistentes: z.array(z.string().trim().min(1).max(120)).max(30).optional(),
    acuerdos: textoOpcional(4000),
    proximoPaso: textoOpcional(1000),
  }),
  output: actividadSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, responsables, ...cambios }, { dryRun }) {
    const actual = await actividadDe(ctx, id);
    const esTarea = actual.tipo === "tarea";
    if (
      !esTarea &&
      (cambios.vencimiento !== undefined || cambios.prioridad || cambios.estado || responsables)
    )
      throw reglaDeNegocio("Solo las tareas llevan vencimiento, prioridad, estado y responsables.");
    if (
      actual.tipo !== "reunion" &&
      (cambios.asistentes || cambios.acuerdos || cambios.proximoPaso)
    )
      throw reglaDeNegocio("Solo las reuniones llevan asistentes, acuerdos y próximo paso.");
    if (actual.estado === "hecha" && cambios.estado)
      throw reglaDeNegocio("La tarea ya está hecha; no se puede cancelar ni reabrir.");
    await exigirResponsables(ctx, responsables ?? []);
    const data = {
      ...Object.fromEntries(Object.entries(cambios).filter(([, v]) => v !== undefined)),
      ...(cambios.ocurrioEn ? { ocurrioEn: new Date(cambios.ocurrioEn) } : {}),
      ...(cambios.vencimiento ? { vencimiento: new Date(cambios.vencimiento) } : {}),
      // Posponer (cambiar el vencimiento) rearma el aviso de tarea vencida.
      ...(cambios.vencimiento !== undefined ? { avisoVencidaEn: null } : {}),
    };
    if (dryRun) {
      const v = await vistaDe(ctx, id);
      return {
        ...v,
        ...(cambios as object),
        ...(responsables ? { responsables } : {}),
      } as typeof v;
    }
    await ctx.transaccion(async (tx) => {
      await tx.actividad.update({ where: { id }, data });
      if (responsables) {
        await tx.actividadResponsable.deleteMany({ where: { actividadId: id } });
        for (const usuarioId of responsables)
          await tx.actividadResponsable.create({
            data: { tenantId: ctx.tenantId, actividadId: id, usuarioId },
          });
      }
      await ctx.eventos.emitir(tx, {
        tipo: "core.actividad.actualizada",
        entidadTipo: "actividad",
        entidadId: id,
        payload: {},
      });
    });
    return vistaDe(ctx, id);
  },
});

export const actividadesCompletar = defineCapability({
  id: "core.actividades.completar",
  descripcion:
    "Marca una tarea como hecha. Es idempotente: si ya estaba hecha, conserva quién y cuándo la completó primero.",
  permiso: PERMISO_MANAGE,
  input: z.object({ id: uuidSchema }),
  output: actividadSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const a = await actividadDe(ctx, input.id);
    if (a.tipo !== "tarea") throw reglaDeNegocio("Solo las tareas se completan.");
    if (a.estado === "cancelada") throw reglaDeNegocio("La tarea está cancelada.");
    if (a.estado === "hecha") return vistaDe(ctx, a.id);
    if (dryRun) return { ...(await vistaDe(ctx, a.id)), estado: "hecha" };
    await ctx.transaccion(async (tx) => {
      await tx.actividad.update({
        where: { id: a.id },
        data: {
          estado: "hecha",
          completadaEn: new Date(),
          completadaPorId: ctx.usuario?.id ?? null,
        },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "core.actividad.tarea_completada",
        entidadTipo: "actividad",
        entidadId: a.id,
        payload: {},
      });
    });
    return vistaDe(ctx, a.id);
  },
});
