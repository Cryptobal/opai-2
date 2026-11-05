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
    const ids: string[] = [];
    const errores: Record<string, number> = {};
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
          await recalcularVersion(ctx, v.cotizacionId, v.numero, true);
          // Solo cuenta lo que quedó guardado: una versión que salió de borrador durante el cálculo no se escribe.
          const ahora = await ctx.db.cpqVersion.findFirst({ where: { id: v.id }, select: { calculoCongeladoJson: true } });
          if (ahora && !calculoAntiguo(ahora.calculoCongeladoJson)) ids.push(v.id);
        } catch (e) {
          // Solo la clase del error (categórica): ni mensaje ni datos de la cotización.
          fallidas++;
          const clase = e instanceof Error ? e.name : "desconocido";
          errores[clase] = (errores[clase] ?? 0) + 1;
        }
      }
      if (lote.length < LOTE) break;
    }
    const recalculadas = ids.length;
    // Una traza por corrida, en su propia transacción: conteos, clases de error e IDs de las versiones
    // recalculadas (UUID, hasta 200; sin contenido de la cotización).
    if (recalculadas > 0 || fallidas > 0)
      await ctx.transaccion(async (tx) => {
        await ctx.auditoria.registrar(tx, {
          tenantId: ctx.tenantId,
          capability: "cpq.cotizaciones.recalcular_antiguos",
          actor: ctx.actor,
          entityType: "cotizacion",
          payload: { recalculadas, fallidas, errores, versionIds: ids.slice(0, 200) },
        });
      });
    return { recalculadas, fallidas };
  },
});

export const trabajosCpq = [trabajoCpqRecalcularAntiguos];
