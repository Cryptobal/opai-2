import type { Contexto, FuenteAprobaciones } from "@opai/capabilities";

import { PERMISO_GESTIONAR } from "./capacidades/permisos";

/** Solo el rol aprobador del tipo decide (R-TCK-006), en un estado que se puede aprobar. */
function donde(ctx: Contexto) {
  return {
    estado: { in: ["abierto", "en_curso"] },
    tipo: { requiereAprobacion: true, aprobadorRol: ctx.rol ?? "" },
  };
}

/** Aporte de Tickets a «Por aprobar» (CAR-253): solicitudes cuyo tipo aprueba el rol del actor. */
export const fuentesAprobacionTickets: readonly FuenteAprobaciones[] = [
  {
    modulo: "tickets",
    origen: "tickets",
    titulo: "Tickets",
    permisos: [PERMISO_GESTIONAR],
    contar: (ctx) => (ctx.rol ? ctx.db.ticket.count({ where: donde(ctx) }) : Promise.resolve(0)),
    async listar(ctx, limite) {
      if (!ctx.rol) return [];
      const filas = await ctx.db.ticket.findMany({
        where: donde(ctx),
        orderBy: { createdAt: "asc" },
        take: limite,
        include: { tipo: { select: { nombre: true } } },
      });
      return filas.map((t) => ({
        id: t.id,
        resumen: `${t.tipo.nombre} · ${t.titulo}`,
        href: `/tickets/${t.id}`,
        creadaEn: t.createdAt.toISOString(),
      }));
    },
  },
];
