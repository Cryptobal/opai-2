import { PERMISOS_CORE } from "@opai/domain";

import { dondePuesto } from "../core/maestros/alcance";
import type { Buscador } from "../core/maestros/buscadores";

const MAX = 5;
const contiene = (q: string) => ({ contains: q, mode: "insensitive" as const });

/**
 * Aporte de Operaciones a la búsqueda global (CAR-404, parte 2 de CAR-301): puestos activos por su nombre o
 * por el de su instalación. Va con la Pauta porque es el módulo de Operaciones; el puesto es del núcleo, así
 * que además pide leer instalaciones. El supervisor solo ve los puestos de sus instalaciones (ADR-022).
 */
export const buscadoresPauta: readonly Buscador[] = [
  {
    modulo: "pauta",
    grupo: "puestos",
    titulo: "Puestos",
    permiso: "pauta:read",
    async buscar(ctx, q) {
      if (!ctx.autorizar(PERMISOS_CORE.instalacionesRead)) return [];
      const filas = await ctx.db.puesto.findMany({
        where: {
          AND: [dondePuesto(ctx)],
          estado: "activo",
          instalacion: { archivadaEn: null },
          OR: [{ nombre: contiene(q) }, { instalacion: { nombre: contiene(q) } }],
        },
        select: { id: true, nombre: true, cobertura: true, instalacionId: true, instalacion: { select: { nombre: true } } },
        orderBy: [{ nombre: "asc" }, { id: "asc" }],
        take: MAX,
      });
      return filas.map((p) => ({
        id: p.id,
        titulo: p.nombre,
        detalle: [p.instalacion.nombre, p.cobertura === "ppc" ? "Por cubrir" : null].filter(Boolean).join(" · "),
        href: `/instalaciones/${p.instalacionId}/puestos?puesto=${p.id}`,
      }));
    },
  },
];
