// Pausa automática del seguimiento y cierre de pasos desde la tarea (brief A §2.3, CAR-160). Los
// consumidores leen de la base, no del payload, salvo la marca explícita «respuesta del cliente»; son
// idempotentes: solo actúan sobre un seguimiento activo, y la respuesta lo deja pausado o cancelado.
import { defineConsumidor, type EventoPublicado } from "../eventos/consumidores";
import type { Contexto } from "../types";
import { configDeVersion } from "./seguimiento-comun";
import { actividadDePaso, aplicarRespuesta } from "./seguimiento-ejecucion";
import { MOTIVO_PASO, efectosPasoHecho } from "./seguimiento-tareas";

/** Seguimiento activo del negocio creado antes del evento (uno iniciado después no se pausa por él). */
async function activoAntesDe(ctx: Contexto, negocioId: string, ev: EventoPublicado) {
  return ctx.db.seguimiento.findFirst({ where: { negocioId, estado: "activo", createdAt: { lte: ev.createdAt } } });
}

async function responder(ctx: Contexto, negocioId: string, ev: EventoPublicado, detalle: string) {
  const s = await activoAntesDe(ctx, negocioId, ev);
  if (!s) return;
  const config = await configDeVersion(ctx, s.planId, s.planVersion);
  await ctx.transaccion((tx) => aplicarRespuesta(ctx, tx, s, config, { titulo: "El cliente respondió", detalle }));
}

/** (a) Una actividad registrada como «respuesta del cliente» en un negocio pausa o detiene su seguimiento. */
export const consumidorRespuestaPorActividad = defineConsumidor({
  id: "comercial.seguimiento_respuesta_actividad",
  descripcion: "Pausa o detiene el seguimiento cuando se registra en el negocio una actividad marcada como respuesta del cliente.",
  eventos: ["core.actividad.registrada"],
  async handler(ctx, ev) {
    const marca = (ev.payload as { respuestaCliente?: unknown } | null)?.respuestaCliente;
    if (!ev.entidadId || marca !== true) return;
    const actividad = await ctx.db.actividad.findUnique({ where: { id: ev.entidadId }, select: { titulo: true, tipo: true } });
    if (!actividad || actividad.tipo === "tarea") return;
    const vinculos = await ctx.db.actividadVinculo.findMany({ where: { actividadId: ev.entidadId, negocioId: { not: null } }, select: { negocioId: true } });
    for (const v of vinculos)
      if (v.negocioId) await responder(ctx, v.negocioId, ev, `Registrado en la actividad «${actividad.titulo}».`);
  },
});

/**
 * (b) Mover el negocio a la etapa «al responder» del plan (Gard: Negociación) o a una posterior cuenta
 * como respuesta: pausa o detiene según el plan y nunca baja la etapa. Los movimientos del propio
 * seguimiento (respuesta, paso con etapa destino) no cuentan.
 */
export const consumidorRespuestaPorEtapa = defineConsumidor({
  id: "comercial.seguimiento_respuesta_etapa",
  descripcion: "Pausa o detiene el seguimiento cuando el negocio pasa a la etapa de negociación del plan o a una posterior.",
  eventos: ["comercial.negocio.etapa_cambiada"],
  async handler(ctx, ev) {
    // El payload es propio (outbox): la etapa a la que se movió en ESE cambio, no la de ahora.
    const p = ev.payload as { motivo?: unknown; aEtapaId?: unknown } | null;
    if (!ev.entidadId || typeof p?.aEtapaId !== "string" || p.motivo === MOTIVO_PASO || p.motivo === "El cliente respondió") return;
    const s = await activoAntesDe(ctx, ev.entidadId, ev);
    if (!s) return;
    const config = await configDeVersion(ctx, s.planId, s.planVersion);
    if (!config.etapaAlResponder) return;
    const negocio = await ctx.db.negocio.findUnique({ where: { id: ev.entidadId }, select: { estado: true } });
    if (negocio?.estado !== "abierto") return;
    const [marcador, actual] = await Promise.all([
      ctx.db.etapa.findUnique({ where: { id: config.etapaAlResponder } }),
      ctx.db.etapa.findUnique({ where: { id: p.aEtapaId } }),
    ]);
    if (!marcador || !actual || actual.tipo !== "abierta" || marcador.embudoId !== actual.embudoId || actual.orden < marcador.orden) return;
    await responder(ctx, ev.entidadId, ev, `El negocio pasó a «${actual.nombre}»: cuenta como respuesta del cliente.`);
  },
});

/**
 * La tarea de un paso marcada hecha en Mis tareas o la Bandeja deja el paso hecho (y aplica su etapa
 * destino); cancelada a mano, el paso queda omitido. Vale con el seguimiento activo o pausado, para que
 * no quede un paso pendiente sin tarea. Idempotente: solo toca un paso que sigue «por hacer».
 */
export const consumidorTareaDePaso = defineConsumidor({
  id: "comercial.seguimiento_tarea_completada",
  descripcion: "Marca hecho (u omitido) el paso de seguimiento cuando su tarea se completa (o se cancela) desde Mis tareas o la Bandeja.",
  eventos: ["core.actividad.tarea_completada", "core.actividad.actualizada"],
  async handler(ctx, ev) {
    if (!ev.entidadId) return;
    const paso = await ctx.db.seguimientoPaso.findFirst({ where: { actividadId: ev.entidadId, estado: "por_hacer" } });
    if (!paso) return;
    const s = await ctx.db.seguimiento.findUnique({ where: { id: paso.seguimientoId } });
    if (s?.estado !== "activo" && s?.estado !== "pausado") return;
    const tarea = await ctx.db.actividad.findUnique({ where: { id: ev.entidadId }, select: { estado: true, completadaPorId: true } });
    const hecha = tarea?.estado === "hecha";
    if (!hecha && tarea?.estado !== "cancelada") return;
    const etapaDestino = hecha ? (await configDeVersion(ctx, s.planId, s.planVersion)).pasos[paso.orden - 1]?.etapaDestino : undefined;
    await ctx.transaccion(async (tx) => {
      const r = await tx.seguimientoPaso.updateMany({
        where: { id: paso.id, estado: "por_hacer" },
        data: hecha
          ? { estado: "hecho", hechoEn: new Date(), hechoPorId: tarea?.completadaPorId ?? null, resultado: "Tarea marcada hecha." }
          : { estado: "omitido", resultado: "Tarea cancelada." },
      });
      if (!r.count) return;
      const aviso = hecha ? await efectosPasoHecho(ctx, tx, { tareaId: null, negocioId: s.negocioId, etapaDestino }) : null;
      if (aviso) await actividadDePaso(ctx, tx, { tipo: "nota", titulo: "Seguimiento: etapa sin cambio", detalle: aviso, negocioId: s.negocioId });
      await ctx.eventos.emitir(tx, { tipo: "comercial.seguimiento.paso_registrado", entidadTipo: "negocio", entidadId: s.negocioId, payload: { seguimientoId: s.id, pasoId: paso.id, accion: hecha ? "hecho" : "omitir" } });
    });
  },
});

export const consumidoresPausaSeguimiento = [consumidorRespuestaPorActividad, consumidorRespuestaPorEtapa, consumidorTareaDePaso];
