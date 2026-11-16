import { noEncontrado } from "../../errores";
import type { Contexto } from "../../types";
import { dondeVisita } from "../../pauta/visitas-comun";

const TICKETS_VER_TODOS = "tickets:tickets.ver_todos";

/** Si el actor puede ver este ticket (solicitante, responsable o ver_todos). */
export async function ticketVisible(
  ctx: Contexto,
  id: string,
): Promise<{ solicitanteId: string; responsableId: string } | null> {
  const t = await ctx.db.ticket.findFirst({
    where: { id },
    select: { solicitanteId: true, responsableId: true },
  });
  if (!t) return null;
  if (ctx.autorizar(TICKETS_VER_TODOS)) return t;
  if (!ctx.usuario) return null;
  if (t.solicitanteId === ctx.usuario.id || t.responsableId === ctx.usuario.id) return t;
  return null;
}

export async function exigirTicket(ctx: Contexto, id: string): Promise<void> {
  if (!(await ticketVisible(ctx, id))) throw noEncontrado("La entidad ticket");
}

export async function visitaVisible(ctx: Contexto, id: string): Promise<boolean> {
  return (await ctx.db.visitaSupervision.count({ where: { id, AND: [dondeVisita(ctx)] } })) > 0;
}

export async function exigirVisita(ctx: Contexto, id: string): Promise<void> {
  if (!(await visitaVisible(ctx, id))) throw noEncontrado("La entidad visita");
}