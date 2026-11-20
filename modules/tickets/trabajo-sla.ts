import { z } from "zod";

import { defineTrabajo, type Contexto } from "@opai/capabilities";

import { ESTADOS_VIVOS } from "./domain";

const EVENTO = "tickets.ticket.sla_vencido";

/** Pendientes reales: el outbox es el registro duradero del evento de sistema. */
function pendientes(ctx: Contexto, ahora: Date) {
  return ctx.transaccion((tx) => tx.$queryRaw<{ id: string }[]>`
    SELECT t.id
    FROM tickets.tickets t
    WHERE t.tenant_id = ${ctx.tenantId}::uuid
      AND t.estado = ANY(${[...ESTADOS_VIVOS]}::text[])
      AND t.sla_vence_en <= ${ahora}::timestamptz
      AND NOT EXISTS (
        SELECT 1 FROM core.eventos e
        WHERE e.tenant_id = t.tenant_id AND e.tipo = ${EVENTO}
          AND e.entidad_tipo = 'ticket' AND e.entidad_id = t.id::text
      )
    ORDER BY t.sla_vence_en, t.id
    LIMIT 200`);
}

async function avisarSla(ctx: Contexto, ahora: Date, signal: AbortSignal) {
  const filas = await pendientes(ctx, ahora);
  let avisados = 0;
  for (const { id } of filas) {
    signal.throwIfAborted();
    const emitido = await ctx.transaccion(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`tickets.sla:${ctx.tenantId}:${id}`}, 0))`;
      const t = await tx.ticket.findFirst({
        where: {
          id,
          estado: { in: [...ESTADOS_VIVOS] },
          slaVenceEn: { not: null, lte: ahora },
        },
        select: { responsableId: true },
      });
      if (!t || (await tx.evento.findFirst({
        where: { tenantId: ctx.tenantId, tipo: EVENTO, entidadTipo: "ticket", entidadId: id },
        select: { id: true },
      }))) return false;
      await ctx.eventos.emitir(tx, {
        tipo: EVENTO,
        entidadTipo: "ticket",
        entidadId: id,
        payload: { responsableId: t.responsableId },
      });
      return true;
    });
    if (emitido) avisados += 1;
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
    "Busca tickets vivos cuyo plazo SLA ya pasó y avisa una vez al responsable; idempotente por evento en el outbox.",
  payload: z.object({ ahora: z.string().datetime().optional() }),
  periodicidad: "horaria",
  async handler(ctx, p, signal) {
    const ahora = p.ahora ? new Date(p.ahora) : new Date();
    const avisados = await avisarSla(ctx, ahora, signal);
    return { avisados };
  },
});
