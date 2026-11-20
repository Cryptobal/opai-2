import { z } from "zod";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { bloquearPeriodoAbierto } from "./bloqueos";
import { PERMISO_PERIODOS, periodoDe } from "./comun";
import { exigirVistaCompleta } from "./liquidaciones-lectura";
import { exigirPeriodoAbierto } from "./novedades-util";

// Revisión de liquidaciones (diseño 03 «Marcar revisadas», CAR-99): quien revisa ya vio los montos, así
// que exige la vista completa. Recalcular el período las devuelve a «calculada» (liquidaciones-calcular).
export const liquidacionesMarcarRevisadas = defineCapability({
  id: "nomina.liquidaciones.marcar_revisadas",
  descripcion:
    "Marca como revisadas todas las liquidaciones calculadas de un período abierto o en revisión, después de revisarlas en pantalla o con nomina.liquidaciones.listar. Si el período se recalcula, vuelven a quedar calculadas y hay que revisarlas de nuevo.",
  permiso: PERMISO_PERIODOS,
  input: z.object({ periodoId: uuidSchema }),
  output: z.object({ revisadas: z.number().int().describe("Liquidaciones que pasaron de calculada a revisada.") }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { periodoId }, { dryRun }) {
    exigirVistaCompleta(ctx);
    const donde = { periodoId, estado: "calculada" };
    if (dryRun) {
      exigirPeriodoAbierto(await periodoDe(ctx, periodoId));
      return { revisadas: await ctx.db.nominaLiquidacion.count({ where: donde }) };
    }
    return ctx.transaccion(async (tx) => {
      await bloquearPeriodoAbierto(tx, ctx.tenantId, periodoId);
      const r = await tx.nominaLiquidacion.updateMany({ where: donde, data: { estado: "revisada" } });
      if (r.count > 0)
        await ctx.eventos.emitir(tx, {
          tipo: "nomina.liquidaciones.revisadas",
          entidadTipo: "periodo",
          entidadId: periodoId,
          payload: { periodoId, cantidad: r.count },
        });
      return { revisadas: r.count };
    });
  },
});
