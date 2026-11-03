// Trabajo horario del seguimiento (CAR-67, ADR-029): vence los pasos, crea tareas o envía el correo, y cierra el plan.
import { z } from "zod";

import { esPasoPendiente, type EstadoPaso } from "@opai/domain";

import { defineConsumidor } from "../eventos/consumidores";
import { defineTrabajo } from "../trabajos/registro";
import { configDeVersion } from "./seguimiento-comun";
import { actividadDePaso, enviarCorreoSeguimiento } from "./seguimiento-ejecucion";

const LOTE = 50;

export const trabajoVencerPasosSeguimiento = defineTrabajo({
  tipo: "comercial.seguimiento.vencer_pasos",
  descripcion: "Vence los pasos de seguimiento comercial: crea la tarea del vendedor, envía el correo automático o deja el paso para el agente, y termina los planes sin pasos pendientes.",
  periodicidad: "horaria",
  payload: z.object({ hora: z.string() }),
  async handler(ctx) {
    const vencidos = await ctx.db.seguimientoPaso.findMany({
      where: { estado: "programado", programadoEn: { lte: new Date() }, seguimiento: { estado: "activo" } },
      orderBy: { programadoEn: "asc" },
      take: LOTE,
    });
    let activados = 0;
    let fallidos = 0;
    for (const paso of vencidos) {
      const s = await ctx.db.seguimiento.findUnique({ where: { id: paso.seguimientoId } });
      if (!s) continue;
      const config = await configDeVersion(ctx, s.planId, s.planVersion);
      const def = config.pasos[paso.orden - 1];
      const negocio = await ctx.db.negocio.findUnique({ where: { id: s.negocioId }, select: { titulo: true, responsableId: true } });
      const titulo = `${def?.titulo ?? `Paso ${paso.orden}`} · ${negocio?.titulo ?? "negocio"}`;
      try {
        if (paso.ejecutor === "opai_automatico" && paso.canal === "correo") {
          if (!def?.guion) throw new Error("El paso automático no tiene texto en el plan.");
          const asunto = `Seguimiento${s.cotizacionCodigo ? ` de la cotización ${s.cotizacionCodigo}` : ""}`;
          const para = await enviarCorreoSeguimiento(ctx, s, asunto, def.guion, negocio?.responsableId ?? null);
          await ctx.transaccion(async (tx) => {
            const actividadId = await actividadDePaso(ctx, tx, { tipo: "correo", titulo: `Seguimiento: ${asunto}`, detalle: `Enviado a ${para}.`, negocioId: s.negocioId });
            await tx.seguimientoPaso.update({ where: { id: paso.id }, data: { estado: "hecho", asunto, cuerpo: def.guion!, hechoEn: new Date(), actividadId } });
          });
        } else {
          const nuevo = paso.ejecutor === "agente" ? "por_preparar" : "por_hacer";
          await ctx.transaccion(async (tx) => {
            const actividadId = paso.ejecutor === "agente" || !paso.asignadoId ? null
              : await actividadDePaso(ctx, tx, { tipo: "tarea", titulo, detalle: def?.guion ?? null, negocioId: s.negocioId, responsables: [paso.asignadoId], vencimiento: paso.programadoEn });
            await tx.seguimientoPaso.update({ where: { id: paso.id }, data: { estado: nuevo, ...(actividadId ? { actividadId } : {}) } });
          });
        }
        activados += 1;
      } catch (e) {
        fallidos += 1;
        await ctx.db.seguimientoPaso.update({ where: { id: paso.id }, data: { estado: "fallido", error: e instanceof Error ? e.message.slice(0, 300) : "Error desconocido" } });
      }
    }
    const vivos = await ctx.db.seguimiento.findMany({ where: { estado: "activo" }, select: { id: true, negocioId: true }, take: 200 });
    let terminados = 0;
    for (const s of vivos) {
      const pasos = await ctx.db.seguimientoPaso.findMany({ where: { seguimientoId: s.id }, select: { estado: true } });
      if (pasos.length && !pasos.some((p) => esPasoPendiente(p.estado as EstadoPaso))) {
        await ctx.transaccion(async (tx) => {
          await tx.seguimiento.update({ where: { id: s.id }, data: { estado: "terminado", motivo: "sin_respuesta" } });
          await ctx.eventos.emitir(tx, { tipo: "comercial.seguimiento.terminado", entidadTipo: "negocio", entidadId: s.negocioId, payload: { seguimientoId: s.id } });
        });
        terminados += 1;
      }
    }
    return { activados, fallidos, terminados };
  },
});

export const trabajosComercial = [trabajoVencerPasosSeguimiento];

/** Al ganar o perder un negocio, su seguimiento vivo termina y los pasos pendientes se cancelan. Idempotente. */
export const consumidorSeguimientoCierre = defineConsumidor({
  id: "comercial.seguimiento_cierre",
  descripcion: "Termina el seguimiento de un negocio cuando se gana o se pierde.",
  eventos: ["comercial.negocio.ganado", "comercial.negocio.perdido"],
  async handler(ctx, ev) {
    if (!ev.entidadId) return;
    const motivo = ev.tipo === "comercial.negocio.ganado" ? "ganado" : "perdido";
    const vivos = await ctx.db.seguimiento.findMany({ where: { negocioId: ev.entidadId, estado: { in: ["activo", "pausado"] } } });
    for (const s of vivos) {
      await ctx.transaccion(async (tx) => {
        await tx.seguimiento.update({ where: { id: s.id }, data: { estado: "terminado", motivo } });
        await tx.seguimientoPaso.updateMany({ where: { seguimientoId: s.id, estado: { in: ["programado", "por_hacer", "por_preparar"] } }, data: { estado: "cancelado" } });
        await ctx.eventos.emitir(tx, { tipo: "comercial.seguimiento.terminado", entidadTipo: "negocio", entidadId: ev.entidadId!, payload: { seguimientoId: s.id, motivo } });
      });
    }
  },
});
