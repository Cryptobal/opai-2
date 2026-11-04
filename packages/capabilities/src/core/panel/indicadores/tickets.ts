import { enScope } from "../../../autorizacion";
import type { Contexto } from "../../../types";

const VIVOS = ["abierto", "en_curso"];

export type TicketsInicio = {
  /** Abiertos de toda la empresa; null si el actor no puede ver todos. */
  abiertos: number | null;
  asignadosAMi: number;
};

export async function ticketsInicio(ctx: Contexto): Promise<TicketsInicio | null> {
  if (!enScope(ctx, "tickets") || !ctx.modulosActivos.includes("tickets")) return null;
  if (!ctx.autorizar("tickets:tickets.ver") || ctx.actor.tipo !== "user") return null;
  const yo = ctx.actor.id;
  const [abiertos, asignadosAMi] = await Promise.all([
    ctx.autorizar("tickets:tickets.ver_todos")
      ? ctx.db.ticket.count({ where: { estado: { in: VIVOS } } })
      : Promise.resolve(null),
    ctx.db.ticket.count({ where: { estado: { in: VIVOS }, responsableId: yo } }),
  ]);
  return { abiertos, asignadosAMi };
}
