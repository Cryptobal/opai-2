import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import {
  PERMISO_APROBAR_EXTRA,
  turnoExtraSchema,
  vistaTurnoExtra,
} from "./turnos-extra-comun";
import {
  aplicarResolucionTurnoExtra,
  turnoPendienteParaResolver,
} from "./turnos-extra-resolver-comun";

/** Rechaza un turno extra pendiente (CAR-96). Irreversible para agentes; nadie rechaza lo propio. */
export const turnosExtraRechazar = defineCapability({
  id: "pauta.turnos_extra.rechazar",
  descripcion:
    "Rechaza un turno extra pendiente con un motivo obligatorio. Quien lo registró no puede rechazarlo. La cobertura de la pauta no cambia. No toca pagos ni Nómina.",
  permiso: PERMISO_APROBAR_EXTRA,
  sensibles: ["motivo"],
  input: z.object({ id: uuidSchema, motivo: z.string().trim().min(5).max(500) }),
  output: z.object({ turno: turnoExtraSchema }),
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const { actorId, t, instalacionId } = await turnoPendienteParaResolver(ctx, input.id, "rechazar");
    if (dryRun) {
      return {
        turno: vistaTurnoExtra({
          ...t,
          estado: "rechazado",
          resueltoPor: actorId,
          resueltoEn: new Date(),
          motivoResolucion: input.motivo,
        }),
      };
    }
    const fila = await ctx.transaccion(async (tx) =>
      aplicarResolucionTurnoExtra(tx, ctx, {
        t,
        actorId,
        instalacionId,
        data: {
          estado: "rechazado",
          resueltoPor: actorId,
          resueltoEn: new Date(),
          motivoResolucion: input.motivo,
        },
        accion: "turno_extra_rechazado",
        evento: "pauta.turno_extra.rechazado",
        detalle: { turnoExtraId: t.id },
      }),
    );
    return { turno: vistaTurnoExtra(fila) };
  },
});
