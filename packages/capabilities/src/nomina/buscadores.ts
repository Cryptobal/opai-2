import { etiquetaPeriodo } from "@opai/domain";

import type { Buscador } from "../core/maestros/buscadores";
import { PERMISO_READ } from "./comun";

const MAX = 5;
/** Períodos que se revisan: tres años bastan para la búsqueda y la consulta queda acotada. */
const VENTANA = 36;
const ESTADO: Record<string, string> = { abierto: "Abierto", en_revision: "En revisión", cerrado: "Cerrado", pagado: "Pagado" };
const normal = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Aporte de Remuneraciones a la búsqueda global (CAR-406): períodos por mes y año, sin montos. */
export const buscadoresNomina: readonly Buscador[] = [
  {
    modulo: "nomina",
    grupo: "remuneraciones",
    titulo: "Remuneraciones",
    permiso: PERMISO_READ,
    async buscar(ctx, q) {
      const filas = await ctx.db.nominaPeriodo.findMany({
        orderBy: [{ anio: "desc" }, { mes: "desc" }],
        take: VENTANA,
        select: { id: true, anio: true, mes: true, estado: true },
      });
      const palabras = normal(q).split(/\s+/).filter(Boolean);
      return filas
        .map((p) => ({ p, etiqueta: etiquetaPeriodo(p.anio, p.mes) }))
        .filter(({ p, etiqueta }) => {
          const texto = normal(`${etiqueta} ${String(p.mes).padStart(2, "0")}/${p.anio} remuneraciones sueldos`);
          return palabras.every((w) => texto.includes(w));
        })
        .slice(0, MAX)
        .map(({ p, etiqueta }) => ({ id: p.id, titulo: `Remuneraciones ${etiqueta}`, detalle: ESTADO[p.estado] ?? p.estado, href: `/remuneraciones/${p.id}` }));
    },
  },
];
