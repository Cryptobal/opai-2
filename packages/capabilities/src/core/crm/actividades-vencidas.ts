// Aviso de tarea vencida (CAR-162). El trabajo diario marca y emite `core.actividad.tarea_vencida`
// una vez por vencimiento; Comunicaciones decide a quién llega (silencio por defecto, ADR-020). El
// consumidor de responsables solo actúa si la empresa activó el ajuste `actividades_aviso_responsables`.
import { z } from "zod";

import { renderizar } from "@opai/domain";

import { defineConsumidor } from "../../eventos/consumidores";
import { defineTrabajo } from "../../trabajos/registro";
import { ajuste } from "../config/valores";
import { comunicableDe, plantillaVigente } from "../comunicaciones/resolver";
import { variablesDe } from "../comunicaciones/variables";

const LOTE = 500;
export const EVENTO_TAREA_VENCIDA = "core.actividad.tarea_vencida";

export const trabajoTareasVencidas = defineTrabajo({
  tipo: "core.actividades.tareas_vencidas",
  descripcion: "Revisa a diario las tareas pendientes vencidas y emite un aviso por cada una.",
  payload: z.object({ dia: z.string() }),
  periodicidad: "diaria",
  async handler(ctx) {
    const vencidas = await ctx.db.actividad.findMany({
      where: {
        tipo: "tarea",
        estado: "pendiente",
        avisoVencidaEn: null,
        vencimiento: { lt: new Date() },
      },
      orderBy: { vencimiento: "asc" },
      take: LOTE,
    });
    let avisos = 0;
    for (const t of vencidas) {
      await ctx.transaccion(async (tx) => {
        // Marca condicional: un reintento o una corrida paralela no emite dos veces.
        const r = await tx.actividad.updateMany({
          where: { id: t.id, avisoVencidaEn: null, estado: "pendiente" },
          data: { avisoVencidaEn: new Date() },
        });
        if (!r.count) return;
        const responsables = await tx.actividadResponsable.findMany({
          where: { actividadId: t.id },
          select: { usuarioId: true },
        });
        await ctx.eventos.emitir(tx, {
          tipo: EVENTO_TAREA_VENCIDA,
          entidadTipo: "actividad",
          entidadId: t.id,
          payload: {
            vencimiento: t.vencimiento?.toISOString() ?? null,
            responsables: responsables.map((x) => x.usuarioId),
          },
        });
        avisos += 1;
      });
    }
    return { revisadas: vencidas.length, avisos };
  },
});

/** Campana a los responsables de la tarea, solo con el ajuste encendido (apagado por defecto). */
export const consumidorTareaVencida = defineConsumidor({
  id: "core.actividades.tarea_vencida_responsables",
  descripcion: "Campana a los responsables cuando su tarea vence, si la empresa lo activó.",
  eventos: [EVENTO_TAREA_VENCIDA],
  async handler(ctx, ev) {
    if (!(await ajuste<boolean>(ctx, "core", "actividades_aviso_responsables"))) return;
    const e = comunicableDe(ev.tipo);
    const plantilla = e ? await plantillaVigente(ctx.db, e, "inapp") : null;
    if (!e || !plantilla || !ev.entidadId) return;
    // Los responsables vigentes se leen de la base, no del payload.
    const responsables = await ctx.db.actividadResponsable.findMany({
      where: { actividadId: ev.entidadId },
      select: { usuarioId: true },
    });
    const activos = await ctx.db.membership.findMany({
      where: { userId: { in: responsables.map((r) => r.usuarioId) }, estado: "activa" },
      select: { userId: true },
    });
    const datos = await variablesDe(ctx, ev);
    const rutas = e.variables.map((v) => v.ruta);
    for (const { userId } of activos) {
      if (await ctx.db.notificacion.findFirst({ where: { eventoId: ev.id, usuarioId: userId } }))
        continue;
      await ctx.db.notificacion.create({
        data: {
          tenantId: ctx.tenantId,
          usuarioId: userId,
          eventoId: ev.id,
          titulo: renderizar(plantilla.asunto, datos, rutas),
          cuerpo: renderizar(plantilla.cuerpo, datos, rutas),
          enlace: typeof datos["url"] === "string" ? datos["url"] : null,
        },
      });
    }
  },
});
