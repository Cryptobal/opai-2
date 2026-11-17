import { z } from "zod";

import { defineTrabajo, type Contexto } from "@opai/capabilities";

import { debeAvisarSlaVencido } from "./domain";
import { ticketsSlaVencidos } from "./capacidades/busqueda";

const ACTOR_SLA = "00000000-0000-4000-8000-000000000001";

async function avisarSla(ctx: Contexto, ahora: Date) {
  const filas = await ticketsSlaVencidos(ctx, ahora);
  let avisados = 0;
  for (const t of filas) {
    if (!debeAvisarSlaVencido({ estado: t.estado as never, slaVenceEn: t.slaVenceEn }, ahora, false))
      continue;
    await ctx.transaccion(async (tx) => {
      await tx.ticketEvento.create({
        data: {
          tenantId: ctx.tenantId,
          ticketId: t.id,
          tipo: "sla_vencido",
          actorId: ACTOR_SLA,
        },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "tickets.ticket.sla_vencido",
        entidadTipo: "ticket",
        entidadId: t.id,
        payload: { responsableId: t.responsableId, titulo: t.titulo, slaVenceEn: t.slaVenceEn?.toISOString() },
      });
    });
    avisados += 1;
  }
  return avisados;
}

/**
 * Repasa tickets con SLA vencido y emite un solo aviso por ticket. El reloj se inyecta en el payload
 * (`ahora`) para probarlo con reloj simulado (CAR-622).
 */
export const trabajoTicketsSla = defineTrabajo({
  tipo: "tickets.sla.vencidos",
  descripcion:
    "Busca tickets vivos cuyo plazo SLA ya pasó y avisa una vez al responsable; idempotente por evento en la línea de tiempo.",
  payload: z.object({ ahora: z.string().datetime().optional() }),
  periodicidad: "horaria",
  async handler(ctx, p) {
    const ahora = p.ahora ? new Date(p.ahora) : new Date();
    const avisados = await avisarSla(ctx, ahora);
    return { avisados };
  },
});