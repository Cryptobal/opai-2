import { z } from "zod";

import { defineTrabajo } from "../../trabajos/registro";
import { horizonte, hoyEn, pautaActiva, zonaDelTenant } from "./comun";
import { regenerarJornada } from "./regenerar-jornada";
import { regenerarPuestos } from "./regenerar-pauta";

/**
 * Mantiene el horizonte (mes en curso y siguiente) a diario. Con Pauta activa vuelve a derivar todos
 * los puestos con serie; sin Pauta, genera desde la jornada pactada. Es idempotente: solo escribe lo
 * que cambió. Sin datos suficientes devuelve avisos, no inventa turnos.
 */
export const trabajoExtenderTurnos = defineTrabajo({
  tipo: "core.turnos_esperados.extender",
  descripcion: "Extiende y corrige a diario los turnos esperados del mes en curso y el siguiente.",
  payload: z.object({ dia: z.string().optional() }),
  periodicidad: "diaria",
  async handler(ctx, payload) {
    const zona = await zonaDelTenant(ctx);
    const { desde, hasta } = horizonte(payload.dia ?? hoyEn(zona));
    if (await pautaActiva(ctx)) {
      const series = await ctx.db.seriePauta.findMany({
        where: { vigenteDesde: { lte: new Date(`${hasta}T00:00:00.000Z`) },
          OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: new Date(`${desde}T00:00:00.000Z`) } }] },
        select: { puestoId: true },
        distinct: ["puestoId"],
      });
      return { modo: "pauta", ...(await regenerarPuestos(ctx, series.map((s) => s.puestoId), desde, hasta)) };
    }
    const r = await regenerarJornada(ctx, desde, hasta);
    return { modo: "jornada_pactada", ...r, avisos: r.avisos.length };
  },
});
