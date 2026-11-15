import { z } from "zod";

import { validarMontoAlAprobar } from "@opai/domain";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { reglaDeNegocio } from "../errores";
import {
  PERMISO_APROBAR_EXTRA,
  turnoExtraSchema,
  vistaTurnoExtra,
} from "./turnos-extra-comun";
import {
  aplicarResolucionTurnoExtra,
  turnoPendienteParaResolver,
} from "./turnos-extra-resolver-comun";

/** Aprueba un turno extra (CAR-96). Irreversible para agentes; nadie aprueba lo propio. */
export const turnosExtraAprobar = defineCapability({
  id: "pauta.turnos_extra.aprobar",
  descripcion:
    "Aprueba un turno extra pendiente. Quien lo registró no puede aprobarlo. Opcionalmente cambia el monto con un motivo (queda auditado). No paga ni informa a Nómina.",
  permiso: PERMISO_APROBAR_EXTRA,
  input: z.object({
    id: uuidSchema,
    montoClp: z.number().int().min(0).optional(),
    montoMotivo: z.string().trim().min(3).max(200).optional(),
  }),
  output: z.object({ turno: turnoExtraSchema }),
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const { actorId, t, instalacionId } = await turnoPendienteParaResolver(ctx, input.id, "aprobar");
    const monto = validarMontoAlAprobar({
      montoActual: t.montoClp,
      montoNuevo: input.montoClp,
      motivo: input.montoMotivo,
    });
    if (!monto.ok) throw reglaDeNegocio(monto.error);
    if (dryRun) {
      return {
        turno: vistaTurnoExtra({
          ...t,
          montoClp: monto.montoClp,
          montoMotivo: monto.montoMotivo ?? t.montoMotivo,
          montoOrigen: monto.origen ?? t.montoOrigen,
          estado: "aprobado",
          resueltoPor: actorId,
          resueltoEn: new Date(),
          motivoResolucion: null,
        }),
      };
    }
    const fila = await ctx.transaccion(async (tx) =>
      aplicarResolucionTurnoExtra(tx, ctx, {
        t,
        actorId,
        instalacionId,
        data: {
          estado: "aprobado",
          resueltoPor: actorId,
          resueltoEn: new Date(),
          montoClp: monto.montoClp,
          ...(monto.montoMotivo ? { montoMotivo: monto.montoMotivo, montoOrigen: "manual" } : {}),
        },
        accion: "turno_extra_aprobado",
        evento: "pauta.turno_extra.aprobado",
        detalle: { turnoExtraId: t.id, montoClp: monto.montoClp },
      }),
    );
    return { turno: vistaTurnoExtra(fila) };
  },
});
