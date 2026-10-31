import { z } from "zod";

import type { TenantTx } from "@opai/db";

import { defineTrabajo } from "../../trabajos/registro";

/**
 * Limpia la marca P1 "No recontratar" vencida (correcciones del Revisor y del abogado, 30-oct 15:33
 * CLT): al pasar `noRecontratarVenceEn` se borran las 4 columnas (marca, motivo, fecha de marca y
 * vencimiento) en la misma operación, para que ninguna lectura vuelva a mostrar una marca vencida ni
 * su motivo anterior. Devuelve cuántas filas cambiaron; nunca falla por no tener candidatas.
 */
export async function limpiarNoRecontratarVencidas(tx: TenantTx, ahora: Date): Promise<number> {
  const { count } = await tx.persona.updateMany({
    where: { noRecontratar: true, noRecontratarVenceEn: { lt: ahora } },
    data: {
      noRecontratar: false,
      noRecontratarMotivo: null,
      noRecontratarEn: null,
      noRecontratarVenceEn: null,
    },
  });
  return count;
}

export const trabajoPersonasNoRecontratarVencer = defineTrabajo({
  tipo: "core.personas.no_recontratar_vencer",
  descripcion:
    "Revisa a diario las marcas «No recontratar» vencidas y las limpia (marca, motivo y fechas), sin dejar un registro con una marca pasada.",
  payload: z.object({ dia: z.string() }),
  periodicidad: "diaria",
  async handler(ctx) {
    const ahora = new Date();
    const limpiadas = await ctx.transaccion(async (tx) => {
      const n = await limpiarNoRecontratarVencidas(tx, ahora);
      if (n > 0) {
        await ctx.eventos.emitir(tx, {
          tipo: "core.persona.no_recontratar_vencida",
          entidadTipo: "persona",
          payload: { filas: n },
        });
      }
      return n;
    });
    return { limpiadas };
  },
});
