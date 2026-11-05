import { z } from "zod";

import { leerUfAlDia, operacionesEmpresa } from "@opai/db";

import { defineTrabajo } from "../../../trabajos/registro";
import { periodoAnterior, periodoDe } from "./calculo";
import { generarCargosDeEmpresa } from "./generar";

/**
 * Cada día genera, si faltan, los cargos del mes anterior de la empresa (ADR-071). Es idempotente:
 * los ya generados se saltan, y lo que no tenía UF publicada se completa en una corrida siguiente.
 */
export const trabajoCobrosMesAnterior = defineTrabajo({
  tipo: "core.cobros.generar_mes_anterior",
  descripcion:
    "Genera los cargos listos para facturar del mes anterior que falten (cobro por módulo).",
  payload: z.object({ dia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
  periodicidad: "diaria",
  handler(ctx, { dia }) {
    return generarCargosDeEmpresa(
      operacionesEmpresa(ctx.db, ctx.tenantId),
      periodoAnterior(periodoDe(dia)),
      (d) => leerUfAlDia(ctx.db, d),
      false,
    );
  },
});
