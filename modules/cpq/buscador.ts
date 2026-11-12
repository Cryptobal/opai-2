import type { Buscador } from "@opai/capabilities";

import { PERMISO_READ } from "./capabilities/permisos";

/** Aporte de CPQ a la búsqueda global (CAR-301): cotizaciones por código o título, sin archivadas. */
export const buscadoresCpq: readonly Buscador[] = [
  {
    modulo: "cpq",
    grupo: "cotizaciones",
    titulo: "Cotizaciones",
    permiso: PERMISO_READ,
    async buscar(ctx, q) {
      const texto = { contains: q, mode: "insensitive" as const };
      const filas = await ctx.db.cpqCotizacion.findMany({
        where: { archivadaEn: null, OR: [{ codigo: texto }, { titulo: texto }] },
        orderBy: [{ id: "desc" }],
        take: 5,
      });
      return filas.map((c) => ({ id: c.id, titulo: c.titulo, detalle: c.codigo, href: `/cotizaciones/${c.id}` }));
    },
  },
];
