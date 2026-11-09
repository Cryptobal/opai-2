// Trabajo diario: genera los borradores pendientes de las programaciones activas (BRIEF-26 · CAR-159).
// Nunca emite al SII. Un error en una programación no detiene a las demás.
import { z } from "zod";

import { defineTrabajo } from "../trabajos/registro";
import { generarProgramacion } from "./ventas-programacion-generar";
import { enviarPreviosPendientes } from "./ventas-programacion-previos";

export const trabajoGenerarProgramaciones = defineTrabajo({
  tipo: "finanzas.ventas_programacion.generar_pendientes",
  descripcion:
    "Genera una vez al día los borradores de factura de las programaciones activas cuya próxima generación ya llegó.",
  payload: z.object({}).passthrough(),
  periodicidad: "diaria",
  async handler(ctx) {
    const ahora = new Date();
    const activas = await ctx.db.ventasProgramacion.findMany({
      where: { activa: true, proximaEjecucionEn: { lte: ahora } },
      select: { id: true },
      orderBy: { proximaEjecucionEn: "asc" },
      take: 200,
    });
    let generados = 0;
    let omitidos = 0;
    let fallidas = 0;
    for (const p of activas) {
      try {
        const res = await generarProgramacion(ctx, p.id, false);
        generados += res.filter((r) => r.estado === "generado").length;
        omitidos += res.filter((r) => r.estado === "omitido").length;
      } catch {
        // Se reintenta mañana: la próxima ejecución no avanzó.
        fallidas += 1;
      }
    }
    // Los previos con día acordado salen aquí, el día que corresponde; los del mismo día de la generación ya salieron.
    const previos = await enviarPreviosPendientes(ctx).catch(() => ({ revisados: 0, enviados: 0 }));
    return { programaciones: activas.length, generados, omitidos, fallidas, previos };
  },
});
