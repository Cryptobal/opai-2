import type { Buscador, Contexto } from "@opai/capabilities";

import { PERMISO_VER, PERMISO_VER_TODOS } from "./capacidades/permisos";

const MAX = 5;
const ESTADO: Record<string, string> = {
  abierto: "Abierto",
  en_curso: "En curso",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
  rechazado: "Rechazado",
};

/**
 * Alcance de filas (ADR-022) en la consulta, igual que la bandeja: con «ver todos», toda la empresa; si no,
 * solo los tickets que pidió o tiene a cargo quien busca. Sin usuario y sin «ver todos», nada.
 */
function alcance(ctx: Contexto): { OR?: object[] } | null {
  if (ctx.autorizar(PERMISO_VER_TODOS)) return {};
  const yo = ctx.usuario?.id;
  return yo ? { OR: [{ solicitanteId: yo }, { responsableId: yo }] } : null;
}

/**
 * Aporte de Tickets a la búsqueda global (CAR-404, parte 2 de CAR-301): por asunto. Los tickets no tienen
 * número visible, así que no se busca por número. El detalle lleva tipo y estado, sin datos personales.
 */
export const buscadoresTickets: readonly Buscador[] = [
  {
    modulo: "tickets",
    grupo: "tickets",
    titulo: "Tickets",
    permiso: PERMISO_VER,
    async buscar(ctx, q) {
      const filtro = alcance(ctx);
      if (!filtro) return [];
      const filas = await ctx.db.ticket.findMany({
        where: { AND: [filtro, { titulo: { contains: q, mode: "insensitive" } }] },
        select: { id: true, titulo: true, estado: true, tipoId: true },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: MAX,
      });
      const tipos = filas.length
        ? await ctx.db.tipoTicket.findMany({ where: { id: { in: [...new Set(filas.map((f) => f.tipoId))] } }, select: { id: true, nombre: true } })
        : [];
      const nombreTipo = new Map(tipos.map((t) => [t.id, t.nombre]));
      return filas.map((f) => ({
        id: f.id,
        titulo: f.titulo,
        detalle: [nombreTipo.get(f.tipoId), ESTADO[f.estado] ?? f.estado].filter(Boolean).join(" · ") || null,
        href: `/tickets/${f.id}`,
      }));
    },
  },
];
