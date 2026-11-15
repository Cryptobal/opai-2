// Consumidor de las listas de ingreso y salida (CAR-355). Idempotente: el despacho reintenta.
//   · core.vinculo.creado    → abre la lista de ingreso (no en importaciones ni en continuidad).
//   · core.vinculo.terminado → abre la lista de salida si la persona ya no tiene vínculos vigentes.
//   · tarea hecha o cancelada desde Mis tareas o la Bandeja → el paso queda hecho u omitido.
//   · anonimización de la persona → las tareas pierden su nombre (Ley 21.719).
import { procesoCompleto } from "@opai/domain";

import { EVENTO_ANONIMIZACION } from "../biometria/comun";
import { defineConsumidor, type EventoPublicado } from "../../eventos/consumidores";
import type { Contexto } from "../../types";
import { abrirProceso } from "./abrir";
import type { Tx } from "./comun";

const ORIGEN = "proceso_persona";

/** Usuario que registró el vínculo: la persona, o el usuario detrás de la key del agente. */
const quienRegistro = (ev: EventoPublicado) =>
  ev.actorTipo === "user" ? ev.actorId : ev.actorTipo === "agent" ? ev.viaUserId : null;

/** Cierra la lista si ningún paso queda por hacer (y la reabre si alguno vuelve a estar por hacer). */
export async function recalcularEstado(tx: Tx, procesoId: string) {
  const pasos = await tx.procesoPersonaPaso.findMany({ where: { procesoId }, select: { estado: true } });
  const completo = procesoCompleto(pasos.map((p) => p.estado));
  await tx.procesoPersona.updateMany({
    where: { id: procesoId, estado: completo ? "abierto" : "cerrado" },
    data: completo ? { estado: "cerrado", cerradoEn: new Date() } : { estado: "abierto", cerradoEn: null },
  });
}

async function desdeTarea(ctx: Contexto, ev: EventoPublicado) {
  const origen = (ev.payload as { origen?: unknown } | null)?.origen;
  if (!ev.entidadId || origen === ORIGEN) return;
  const paso = await ctx.db.procesoPersonaPaso.findFirst({ where: { actividadId: ev.entidadId, estado: "por_hacer" } });
  if (!paso) return;
  const tarea = await ctx.db.actividad.findUnique({
    where: { id: ev.entidadId },
    select: { estado: true, completadaPorId: true, completadaEn: true },
  });
  const hecha = tarea?.estado === "hecha";
  if (!hecha && tarea?.estado !== "cancelada") return;
  await ctx.transaccion(async (tx) => {
    const r = await tx.procesoPersonaPaso.updateMany({
      where: { id: paso.id, estado: "por_hacer" },
      data: hecha
        ? { estado: "hecho", hechoEn: tarea.completadaEn ?? new Date(), hechoPorId: tarea.completadaPorId ?? null }
        : { estado: "omitido", nota: paso.nota ?? "Tarea cancelada." },
    });
    if (r.count) await recalcularEstado(tx, paso.procesoId);
  });
}

async function anonimizar(ctx: Contexto, personaId: string) {
  const procesos = await ctx.db.procesoPersona.findMany({
    where: { personaId },
    select: { tipo: true, pasos: { select: { titulo: true, actividadId: true } } },
  });
  for (const pr of procesos)
    for (const p of pr.pasos)
      if (p.actividadId)
        await ctx.db.actividad.updateMany({
          where: { id: p.actividadId },
          data: { titulo: `${pr.tipo === "ingreso" ? "Ingreso" : "Salida"}: ${p.titulo}`, detalle: null },
        });
}

export const consumidorProcesosPersona = defineConsumidor({
  id: "core.personas.procesos",
  descripcion:
    "Abre las listas de ingreso y salida de una persona al crear o terminar su vínculo, y cierra cada paso cuando su tarea se completa.",
  eventos: [
    "core.vinculo.creado",
    "core.vinculo.terminado",
    "core.actividad.tarea_completada",
    "core.actividad.actualizada",
    EVENTO_ANONIMIZACION,
  ],
  async handler(ctx, ev) {
    if (!ev.entidadId) return;
    if (ev.tipo === "core.vinculo.creado") {
      // Un contrato importado (CAR-282) es historia, no un ingreso nuevo.
      if ((ev.payload as { origen?: unknown } | null)?.origen === "importacion") return;
      await abrirProceso(ctx, ev.entidadId, "ingreso", quienRegistro(ev));
      return;
    }
    if (ev.tipo === "core.vinculo.terminado") {
      await abrirProceso(ctx, ev.entidadId, "salida", quienRegistro(ev));
      return;
    }
    if (ev.tipo === EVENTO_ANONIMIZACION) {
      await anonimizar(ctx, ev.entidadId);
      return;
    }
    await desdeTarea(ctx, ev);
  },
});
