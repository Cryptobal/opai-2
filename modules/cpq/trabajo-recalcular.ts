import { defineTrabajo } from "@opai/capabilities";
import { z } from "zod";

import { esResultadoCalculoCompleto } from "./persistencia/calculo-congelado";
import { recalcularVersion } from "./persistencia/recalcular";

const LOTE = 200;
/** Tope por corrida y empresa; lo que quede cae al día siguiente. */
const MAX_LOTES = 5;

function calculoAntiguo(json: string | null): boolean {
  if (!json) return true;
  try {
    return !esResultadoCalculoCompleto(JSON.parse(json));
  } catch {
    return true;
  }
}

/**
 * Recalcula los borradores cuyo cálculo guardado es del formato anterior a las reglas de CAR-192 (CAR-192,
 * pendiente de #330). Sin migración: usa el recalculado normal de la ficha, que reescribe el cálculo y la
 * venta del borrador y nada más. Solo borradores; lo enviado, lista o en aprobación no se toca. Una vez
 * recalculado el borrador deja de ser candidato, así que el trabajo se vacía solo. Devuelve contadores.
 */
export const trabajoCpqRecalcularAntiguos = defineTrabajo({
  tipo: "cpq.cotizaciones.recalcular_antiguos",
  descripcion:
    "Recalcula a diario los borradores de cotización con un cálculo guardado antiguo, para que la lista muestre su margen.",
  payload: z.object({ dia: z.string().optional() }),
  periodicidad: "diaria",
  async handler(ctx) {
    let recalculadas = 0;
    let fallidas = 0;
    let despues: string | undefined;
    for (let i = 0; i < MAX_LOTES; i++) {
      const lote = await ctx.db.cpqVersion.findMany({
        where: { tenantId: ctx.tenantId, estado: "borrador", ...(despues ? { id: { gt: despues } } : {}) },
        select: { id: true, cotizacionId: true, numero: true, calculoCongeladoJson: true },
        orderBy: { id: "asc" },
        take: LOTE,
      });
      if (lote.length === 0) break;
      despues = lote.at(-1)!.id;
      for (const v of lote.filter((x) => calculoAntiguo(x.calculoCongeladoJson))) {
        try {
          if (await recalcularVersion(ctx, v.cotizacionId, v.numero, true)) recalculadas++;
        } catch {
          fallidas++;
        }
      }
      if (lote.length < LOTE) break;
    }
    return { recalculadas, fallidas };
  },
});

export const trabajosCpq = [trabajoCpqRecalcularAntiguos];
