import type { Contexto } from "@opai/capabilities";

import { ESTADOS_VIVOS } from "../domain";

const MIN = 2;

/** Filtro por texto: asunto, solicitante (nombre) y prefijo del número (UUID). */
export async function dondeTexto(ctx: Contexto, q: string | undefined): Promise<object> {
  const term = q?.trim() ?? "";
  if (term.length < MIN) return {};
  const solicitantes = (
    await ctx.db.user.findMany({
      where: { name: { contains: term, mode: "insensitive" } },
      select: { id: true },
      take: 50,
    })
  ).map((u) => u.id);
  const or: object[] = [{ titulo: { contains: term, mode: "insensitive" } }];
  if (solicitantes.length) or.push({ solicitanteId: { in: solicitantes } });
  const hex = term.replace(/-/g, "");
  if (/^[0-9a-f]{4,}$/i.test(hex)) or.push({ id: { startsWith: hex.slice(0, 8).toLowerCase() } });
  return { OR: or };
}

/** Tickets vivos con SLA vencido antes de `ahora` y sin evento `sla_vencido`. */
export async function ticketsSlaVencidos(ctx: Contexto, ahora: Date) {
  const filas = await ctx.db.ticket.findMany({
    where: {
      estado: { in: [...ESTADOS_VIVOS] },
      slaVenceEn: { not: null, lt: ahora },
      eventos: { none: { tipo: "sla_vencido" } },
    },
    select: { id: true, titulo: true, estado: true, responsableId: true, slaVenceEn: true },
    take: 200,
  });
  return filas;
}