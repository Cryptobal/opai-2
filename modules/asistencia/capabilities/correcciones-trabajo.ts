import { z } from "zod";

import { defineTrabajo } from "@opai/capabilities";

import { registrarRespuesta } from "./correcciones-responder";

/**
 * Registra como «vencida» (y por tanto aceptada por falta de oposición) toda corrección sin respuesta cuyo
 * plazo ya pasó. Idempotente: la respuesta es única por corrección. El reloj se inyecta para probarlo.
 */
export const trabajoVencerCorrecciones = defineTrabajo({
  tipo: "asistencia.correcciones.vencer",
  descripcion: "Registra como vencidas las correcciones de marcas sin respuesta pasado su plazo.",
  payload: z.object({ ahora: z.string().datetime().optional() }),
  periodicidad: "horaria",
  async handler(ctx, p) {
    const ahora = p.ahora ? new Date(p.ahora) : new Date();
    const pendientes = await ctx.db.correccion.findMany({
      where: { venceEn: { lte: ahora }, NOT: { id: { in: (await ctx.db.correccionRespuesta.findMany({ select: { correccionId: true } })).map((r) => r.correccionId) } } },
      select: { id: true }, take: 500,
    });
    let vencidas = 0;
    for (const c of pendientes) {
      try {
        await ctx.transaccion((tx) => registrarRespuesta(ctx, tx, c.id, "vencida", undefined, "sistema", ahora));
        vencidas += 1;
      } catch {
        // otra corrida la resolvió primero (única por corrección): no es un error
      }
    }
    return { vencidas };
  },
});
