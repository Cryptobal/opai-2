import { defineConsumidor, type EventoPublicado } from "@opai/capabilities";

const ESTADO: Record<string, string> = {
  abierto: "abierto",
  en_curso: "en curso",
  resuelto: "resuelto",
  cerrado: "cerrado",
  rechazado: "rechazado",
};

type Aviso = { para: "solicitante" | "responsable"; titulo: string; cuerpo: string };

/** Qué avisar por cada evento. El texto no copia el motivo ni la descripción: el detalle está en la ficha. */
function avisoDe(ev: EventoPublicado, titulo: string, estado: string): Aviso | null {
  const ticket = `«${titulo}»`;
  switch (ev.tipo) {
    case "tickets.ticket.creado":
      return { para: "responsable", titulo: "Tienes un ticket nuevo", cuerpo: `${ticket} quedó a tu cargo.` };
    case "tickets.ticket.reasignado":
      return { para: "responsable", titulo: "Te asignaron un ticket", cuerpo: `${ticket} quedó a tu cargo.` };
    case "tickets.ticket.estado_cambiado":
      return { para: "solicitante", titulo: "Tu ticket cambió de estado", cuerpo: `${ticket} está ${ESTADO[estado] ?? estado}.` };
    case "tickets.ticket.aprobado":
      return { para: "solicitante", titulo: "Aprobaron tu solicitud", cuerpo: `${ticket} fue aprobada.` };
    case "tickets.ticket.rechazado":
      return { para: "solicitante", titulo: "Rechazaron tu solicitud", cuerpo: `${ticket} fue rechazada. Revisa el motivo en la ficha.` };
    default:
      return null;
  }
}

/**
 * Avisos de Tickets en la campana (CAR-84, PR 2 del Brief 13): al responsable cuando un ticket queda a su cargo y a
 * quien lo pidió cuando cambia de estado, se aprueba o se rechaza. Nunca a quien hizo el cambio. Idempotente por
 * evento y usuario (el despacho reintenta). El correo queda para cuando Tickets declare sus comunicables (ADR-020).
 */
export const consumidorTicketsAvisos = defineConsumidor({
  id: "tickets.avisos",
  descripcion: "Avisa en la campana al responsable de un ticket nuevo o reasignado y a quien lo pidió cuando avanza.",
  eventos: [
    "tickets.ticket.creado",
    "tickets.ticket.reasignado",
    "tickets.ticket.estado_cambiado",
    "tickets.ticket.aprobado",
    "tickets.ticket.rechazado",
  ],
  async handler(ctx, ev) {
    if (ev.entidadTipo !== "ticket" || !ev.entidadId) return;
    const t = await ctx.db.ticket.findFirst({
      where: { id: ev.entidadId },
      select: { id: true, titulo: true, estado: true, solicitanteId: true, responsableId: true },
    });
    if (!t) return;
    // El estado y el responsable del momento del evento (payload), no los de ahora: el despacho puede llegar tarde.
    const p = (ev.payload ?? {}) as { a?: unknown; responsableId?: unknown };
    const aviso = avisoDe(ev, t.titulo, typeof p.a === "string" ? p.a : t.estado);
    if (!aviso) return;
    const responsable = typeof p.responsableId === "string" ? p.responsableId : t.responsableId;
    const usuarioId = aviso.para === "solicitante" ? t.solicitanteId : responsable;
    if (usuarioId === ev.actorId || usuarioId === ev.viaUserId) return;
    const activo = await ctx.db.membership.findFirst({ where: { tenantId: ctx.tenantId, userId: usuarioId, estado: "activa" }, select: { userId: true } });
    if (!activo) return;
    if (await ctx.db.notificacion.findFirst({ where: { eventoId: ev.id, usuarioId } })) return;
    await ctx.db.notificacion.create({
      data: { tenantId: ctx.tenantId, usuarioId, eventoId: ev.id, titulo: aviso.titulo, cuerpo: aviso.cuerpo, enlace: `/tickets/${t.id}` },
    });
  },
});
