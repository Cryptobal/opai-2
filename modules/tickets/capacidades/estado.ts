import { z } from "zod";

import { conflicto, defineCapability, noEncontrado, prohibido, reglaDeNegocio } from "@opai/capabilities";

import { esEstadoTerminal, puedeTransicionar, type EstadoTicket } from "../domain";
import { uuidSchema } from "./esquemas";
import { PERMISO_GESTIONAR, PERMISO_VER_TODOS } from "./permisos";
import { exigirMiembroActivo, ticketDe, vistaDeFila } from "./util";

function puedeGestionar(ctx: { usuario: { id: string } | null; autorizar(p: string): boolean }, t: { responsableId: string }) {
  return ctx.autorizar(PERMISO_VER_TODOS) || t.responsableId === ctx.usuario?.id;
}

export const ticketsCambiarEstado = defineCapability({
  id: "tickets.tickets.cambiar_estado",
  descripcion:
    "Cambia el estado de un ticket siguiendo las transiciones válidas (ADR-025); solo el responsable o quien ve todos los tickets. El rechazo usa su propia capacidad con motivo.",
  permiso: PERMISO_GESTIONAR,
  input: z.object({ id: uuidSchema, estado: z.enum(["en_curso", "resuelto", "cerrado"]) }),
  output: z.object({ id: uuidSchema, estado: z.string() }),
  efecto: "escritura",
  // Cerrar es terminal (R6): un agente lo deja en la cola de aprobación humana.
  exigeAprobacion: (input) => input.estado === "cerrado",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const t = await ticketDe(ctx, input.id);
    if (!(await vistaDeFila(ctx, t))) throw noEncontrado("El ticket");
    if (!puedeGestionar(ctx, t)) throw prohibido("Solo el responsable del ticket cambia su estado.");
    if (!puedeTransicionar(t.estado as EstadoTicket, input.estado))
      throw reglaDeNegocio(`No se puede pasar de "${t.estado}" a "${input.estado}".`);
    if (dryRun) return { id: input.id, estado: input.estado };
    await ctx.transaccion(async (tx) => {
      const r = await tx.ticket.updateMany({
        where: { id: t.id, estado: t.estado },
        data: {
          estado: input.estado,
          ...(input.estado === "resuelto" ? { resueltoEn: new Date() } : {}),
          ...(input.estado === "cerrado" ? { cerradoEn: new Date() } : {}),
        },
      });
      if (r.count !== 1) throw conflicto("El ticket cambió de estado mientras tanto.");
      await tx.ticketEvento.create({
        data: {
          tenantId: ctx.tenantId,
          ticketId: t.id,
          tipo: "cambio_estado",
          actorId: ctx.usuario!.id,
          estadoDesde: t.estado,
          estadoHasta: input.estado,
        },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "tickets.ticket.estado_cambiado",
        entidadTipo: "ticket",
        entidadId: t.id,
        payload: { de: t.estado, a: input.estado },
      });
    });
    return { id: t.id, estado: input.estado };
  },
});

export const ticketsReasignar = defineCapability({
  id: "tickets.tickets.reasignar",
  descripcion:
    "Cambia el responsable de un ticket vivo con un motivo; lo hace el responsable actual o quien ve todos los tickets, nunca a un ticket cerrado o rechazado.",
  permiso: PERMISO_GESTIONAR,
  input: z.object({ id: uuidSchema, responsableId: uuidSchema, motivo: z.string().trim().min(5).max(500) }),
  output: z.object({ id: uuidSchema }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const t = await ticketDe(ctx, input.id);
    if (!(await vistaDeFila(ctx, t))) throw noEncontrado("El ticket");
    if (!puedeGestionar(ctx, t)) throw prohibido("Solo el responsable del ticket lo reasigna.");
    if (esEstadoTerminal(t.estado as EstadoTicket))
      throw reglaDeNegocio("Un ticket cerrado o rechazado no se reasigna.");
    await exigirMiembroActivo(ctx, input.responsableId, "El nuevo responsable");
    if (dryRun) return { id: input.id };
    await ctx.transaccion(async (tx) => {
      const r = await tx.ticket.updateMany({
        where: { id: t.id, responsableId: t.responsableId },
        data: { responsableId: input.responsableId },
      });
      if (r.count !== 1) throw conflicto("El ticket cambió de responsable mientras tanto.");
      await tx.ticketEvento.create({
        data: {
          tenantId: ctx.tenantId,
          ticketId: t.id,
          tipo: "reasignado",
          actorId: ctx.usuario!.id,
          comentario: input.motivo,
        },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "tickets.ticket.reasignado",
        entidadTipo: "ticket",
        entidadId: t.id,
        payload: { responsableId: input.responsableId },
      });
    });
    return { id: t.id };
  },
});
