import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { conflicto, prohibido } from "../errores";
import { anotar } from "./anotar";
import { fechaIso } from "./comun";
import {
  PERMISO_APROBAR_EXTRA,
  quienResuelveExtra,
  turnoExtraPorAprobar,
  turnoExtraSchema,
  vistaTurnoExtra,
} from "./turnos-extra-comun";

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
    const actorId = quienResuelveExtra(ctx);
    const { t, instalacionId } = await turnoExtraPorAprobar(ctx, input.id);
    if (t.estado !== "por_aprobar") throw conflicto("El turno extra ya no está por aprobar.");
    if (t.registradoPor === actorId) throw prohibido("No puedes rechazar un turno extra que tú registraste.");
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
    const fila = await ctx.transaccion(async (tx) => {
      const r = await tx.turnoExtra.updateMany({
        where: {
          id: t.id,
          estado: "por_aprobar",
          OR: [{ registradoPor: null }, { registradoPor: { not: actorId } }],
        },
        data: {
          estado: "rechazado",
          resueltoPor: actorId,
          resueltoEn: new Date(),
          motivoResolucion: input.motivo,
        },
      });
      if (r.count !== 1) throw conflicto("El turno extra ya no está por aprobar o no puedes resolverlo.");
      await anotar(tx, ctx, {
        instalacionId,
        puestoId: t.puestoId,
        accion: "turno_extra_rechazado",
        desde: fechaIso(t.fecha),
        hasta: fechaIso(t.fecha),
        detalle: { turnoExtraId: t.id },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "pauta.turno_extra.rechazado",
        entidadTipo: "turno_extra",
        entidadId: t.id,
        payload: { puestoId: t.puestoId },
      });
      return tx.turnoExtra.findUniqueOrThrow({ where: { id: t.id } });
    });
    return { turno: vistaTurnoExtra(fila) };
  },
});
