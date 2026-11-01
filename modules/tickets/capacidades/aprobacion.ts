import { z } from "zod";

import type { Contexto } from "@opai/capabilities";
import { conflicto, defineCapability, noEncontrado, prohibido, reglaDeNegocio } from "@opai/capabilities";

import { puedeAprobarse, type EstadoTicket } from "../domain";
import { uuidSchema } from "./esquemas";
import { PERMISO_GESTIONAR } from "./permisos";

async function solicitudDe(ctx: Contexto, id: string) {
  const t = await ctx.db.ticket.findFirst({ where: { id } });
  if (!t) throw noEncontrado("El ticket");
  const tipo = await ctx.db.tipoTicket.findFirst({ where: { id: t.tipoId } });
  if (!tipo) throw noEncontrado("El tipo del ticket");
  if (!tipo.requiereAprobacion) throw reglaDeNegocio("Este tipo de ticket no requiere aprobación.");
  return { ...t, tipo };
}

/**
 * Solo el rol aprobador del tipo decide (R-TCK-006). `ver_todos` es de lectura y alcance: no
 * reemplaza al aprobador, así que un rol con `tickets:*` que no es el aprobador no aprueba ni rechaza.
 */
function puedeResolver(ctx: { rol: string | null }, t: { tipo: { aprobadorRol: string | null } }) {
  return ctx.rol != null && ctx.rol === t.tipo.aprobadorRol;
}

export const ticketsAprobar = defineCapability({
  id: "tickets.tickets.aprobar",
  descripcion:
    "Aprueba una solicitud con aprobación: la marca resuelta. Solo el rol aprobador del tipo (R-TCK-006); la UI pide confirmación antes de llamarla (decisión de Carlos).",
  permiso: PERMISO_GESTIONAR,
  input: z.object({ id: uuidSchema }),
  output: z.object({ id: uuidSchema }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const t = await solicitudDe(ctx, input.id);
    if (!puedeResolver(ctx, t)) throw prohibido("Solo el aprobador de este tipo aprueba la solicitud.");
    if (!puedeAprobarse(t.estado as EstadoTicket))
      throw reglaDeNegocio(`No se puede aprobar un ticket "${t.estado}".`);
    if (dryRun) return { id: input.id };
    await ctx.transaccion(async (tx) => {
      const r = await tx.ticket.updateMany({
        where: { id: t.id, estado: t.estado },
        data: { estado: "resuelto", resueltoEn: new Date() },
      });
      if (r.count !== 1) throw conflicto("La solicitud cambió de estado mientras tanto.");
      await tx.ticketEvento.create({
        data: {
          tenantId: ctx.tenantId,
          ticketId: t.id,
          tipo: "aprobado",
          actorId: ctx.usuario!.id,
          estadoDesde: t.estado,
          estadoHasta: "resuelto",
        },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "tickets.ticket.aprobado",
        entidadTipo: "ticket",
        entidadId: t.id,
      });
    });
    return { id: t.id };
  },
});

export const ticketsRechazar = defineCapability({
  id: "tickets.tickets.rechazar",
  descripcion:
    "Rechaza una solicitud con aprobación con un motivo obligatorio. Solo el rol aprobador del tipo (R-TCK-006).",
  permiso: PERMISO_GESTIONAR,
  input: z.object({ id: uuidSchema, motivo: z.string().trim().min(5).max(500) }),
  output: z.object({ id: uuidSchema }),
  efecto: "escritura",
  // Rechazar es terminal (R6): un agente lo deja en la cola de aprobación humana.
  exigeAprobacion: () => true,
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const t = await solicitudDe(ctx, input.id);
    if (!puedeResolver(ctx, t)) throw prohibido("Solo el aprobador de este tipo rechaza la solicitud.");
    if (!puedeAprobarse(t.estado as EstadoTicket))
      throw reglaDeNegocio(`No se puede rechazar un ticket "${t.estado}".`);
    if (dryRun) return { id: input.id };
    await ctx.transaccion(async (tx) => {
      const r = await tx.ticket.updateMany({
        where: { id: t.id, estado: t.estado },
        data: { estado: "rechazado", motivoRechazo: input.motivo },
      });
      if (r.count !== 1) throw conflicto("La solicitud cambió de estado mientras tanto.");
      await tx.ticketEvento.create({
        data: {
          tenantId: ctx.tenantId,
          ticketId: t.id,
          tipo: "rechazado",
          actorId: ctx.usuario!.id,
          comentario: input.motivo,
          estadoDesde: t.estado,
          estadoHasta: "rechazado",
        },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "tickets.ticket.rechazado",
        entidadTipo: "ticket",
        entidadId: t.id,
      });
    });
    return { id: t.id };
  },
});
