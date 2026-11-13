import type { FuenteAprobaciones } from "@opai/capabilities";

import { contarPendientesBandejaCpq, listarBandejaCpq } from "./persistencia/aprobaciones-bandeja";

/**
 * Aporte de CPQ a «Por aprobar» (CAR-253): margen (`cpq:aprobar`) y envíos conjuntos
 * (`cpq:envios.aprobar`), con el mismo criterio y el mismo detalle que su bandeja.
 */
export const fuentesAprobacionCpq: readonly FuenteAprobaciones[] = [
  {
    modulo: "cpq",
    origen: "cpq",
    titulo: "Cotizaciones",
    permisos: ["cpq:aprobar", "cpq:envios.aprobar"],
    contar: (ctx) => contarPendientesBandejaCpq(ctx),
    async listar(ctx, limite) {
      const items = await listarBandejaCpq(ctx, false);
      return items.slice(0, limite).map((i) => ({
        id: i.id,
        resumen: i.resumen,
        href: `/configuracion/aprobaciones?ver=${encodeURIComponent(i.id)}`,
        creadaEn: i.creadaEn,
      }));
    },
  },
];
