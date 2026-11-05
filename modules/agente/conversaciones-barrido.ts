import { defineTrabajo } from "@opai/capabilities";
import { z } from "zod";

import { auditarPurga } from "./conversaciones-auditoria";
import { corteRetencion, diasRetencion } from "./conversaciones-guardado";

const LOTE = 500;
/** Tope de la corrida: 10.000 conversaciones por empresa y día; el resto cae al día siguiente. */
const MAX_LOTES = 20;

/**
 * Barrido de retención (CAR-120, PR 5c): a diario, por empresa y con su RLS, borra las conversaciones
 * del agente sin actividad por más del plazo configurado (90 días por defecto). Complementa la purga
 * al guardar, que solo alcanza a quien sigue usando el agente. Devuelve contadores, nunca contenido.
 */
export const trabajoConversacionesVencidas = defineTrabajo({
  tipo: "agente.conversaciones.vencidas",
  descripcion:
    "Borra a diario las conversaciones del agente interno que superaron el plazo de retención de la empresa.",
  payload: z.object({ dia: z.string().optional() }),
  periodicidad: "diaria",
  async handler(ctx) {
    const corte = corteRetencion(new Date(), await diasRetencion(ctx));
    let borradas = 0;
    for (let i = 0; i < MAX_LOTES; i++) {
      const lote = await ctx.db.agenteConversacion.findMany({
        where: { tenantId: ctx.tenantId, ultimaActividad: { lt: corte } },
        select: { id: true },
        take: LOTE,
      });
      if (lote.length === 0) break;
      // Cada lote se borra junto con su traza de auditoría (solo el conteo): sin una no hay la otra.
      const n = await ctx.transaccion(async (tx) => {
        const r = await tx.agenteConversacion.deleteMany({
          // Repite el plazo: una conversación que recibió un turno tras el findMany ya no está vencida.
          where: {
            tenantId: ctx.tenantId,
            id: { in: lote.map((c) => c.id) },
            ultimaActividad: { lt: corte },
          },
        });
        if (r.count > 0) await auditarPurga(ctx, tx, { borradas: r.count, corte, origen: "barrido" });
        return r.count;
      });
      borradas += n;
      if (lote.length < LOTE) break;
    }
    return { borradas };
  },
});

export const trabajosAgente = [trabajoConversacionesVencidas];
