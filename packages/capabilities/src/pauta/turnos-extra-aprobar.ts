import { z } from "zod";

import { validarMontoAlAprobar } from "@opai/domain";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { conflicto, prohibido, reglaDeNegocio } from "../errores";
import { anotar } from "./anotar";
import { fechaIso } from "./comun";
import {
  PERMISO_APROBAR_EXTRA,
  quienResuelveExtra,
  turnoExtraPorAprobar,
  turnoExtraSchema,
  vistaTurnoExtra,
} from "./turnos-extra-comun";

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
    const actorId = quienResuelveExtra(ctx);
    const { t, instalacionId } = await turnoExtraPorAprobar(ctx, input.id);
    if (t.estado !== "por_aprobar") throw conflicto("El turno extra ya no está por aprobar.");
    if (t.registradoPor === actorId) throw prohibido("No puedes aprobar un turno extra que tú registraste.");
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
    const fila = await ctx.transaccion(async (tx) => {
      const data = {
        estado: "aprobado",
        resueltoPor: actorId,
        resueltoEn: new Date(),
        montoClp: monto.montoClp,
        ...(monto.montoMotivo ? { montoMotivo: monto.montoMotivo, montoOrigen: "manual" as const } : {}),
      };
      const r = await tx.turnoExtra.updateMany({
        where: { id: t.id, estado: "por_aprobar", OR: [{ registradoPor: null }, { registradoPor: { not: actorId } }] },
        data,
      });
      if (r.count !== 1) throw conflicto("El turno extra ya no está por aprobar o no puedes resolverlo.");
      await anotar(tx, ctx, {
        instalacionId,
        puestoId: t.puestoId,
        accion: "turno_extra_aprobado",
        desde: fechaIso(t.fecha),
        hasta: fechaIso(t.fecha),
        detalle: { turnoExtraId: t.id, montoClp: monto.montoClp },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "pauta.turno_extra.aprobado",
        entidadTipo: "turno_extra",
        entidadId: t.id,
        payload: { puestoId: t.puestoId },
      });
      return tx.turnoExtra.findUniqueOrThrow({ where: { id: t.id } });
    });
    return { turno: vistaTurnoExtra(fila) };
  },
});
