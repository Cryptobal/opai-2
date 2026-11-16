import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { sinDuplicado } from "../core/maestros/comun";
import { defineCapability } from "../define";
import { conflicto } from "../errores";
import { anotar } from "./anotar";
import { PERMISO_WRITE, fechaIso } from "./comun";
import {
  excepcionParaExtra,
  insertarTurnoExtra,
  turnoExtraSchema,
  vistaTurnoExtra,
} from "./turnos-extra-comun";

const inputSchema = z.object({
  excepcionId: uuidSchema,
  tipoTrabajador: z.enum(["propio", "externo"]).default("propio"),
});

/** Registra un turno extra sobre un reemplazo o refuerzo ya creado (CAR-96). */
export const turnosExtraRegistrar = defineCapability({
  id: "pauta.turnos_extra.registrar",
  descripcion:
    "Registra un turno extra por aprobar sobre una excepción de reemplazo o refuerzo: guarda el tipo de trabajador (propio o externo) y el monto sugerido según la tarifa del puesto o de la instalación. No mueve plata ni informa a Nómina.",
  permiso: PERMISO_WRITE,
  input: inputSchema,
  output: z.object({ turno: turnoExtraSchema }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const ex = await excepcionParaExtra(ctx, input.excepcionId);
    const ya = await ctx.db.turnoExtra.findFirst({
      where: { excepcionId: ex.id },
      select: { id: true },
    });
    if (ya) throw conflicto("Esa excepción ya tiene un turno extra registrado.");
    if (dryRun) {
      return {
        turno: turnoExtraSchema.parse({
          id: "00000000-0000-7000-8000-000000000000",
          puestoId: ex.puestoId,
          fecha: fechaIso(ex.fecha),
          personaId: ex.personaId,
          excepcionId: ex.id,
          tipoTrabajador: input.tipoTrabajador,
          montoClp: 0,
          montoMotivo: null,
          montoOrigen: "sin_tarifa",
          estado: "por_aprobar",
          registradoPor: ctx.usuario?.id ?? null,
          resueltoPor: null,
          resueltoEn: null,
          motivoResolucion: null,
        }),
      };
    }
    const fila = await ctx.transaccion(async (tx) => {
      const creada = await sinDuplicado(
        insertarTurnoExtra(tx, ctx, {
          puestoId: ex.puestoId,
          instalacionId: ex.instalacionId,
          fecha: fechaIso(ex.fecha),
          personaId: ex.personaId,
          excepcionId: ex.id,
          tipoTrabajador: input.tipoTrabajador,
        }),
        "Esa excepción ya tiene un turno extra registrado.",
      );
      await anotar(tx, ctx, {
        instalacionId: ex.instalacionId,
        puestoId: ex.puestoId,
        accion: "turno_extra_registrado",
        desde: fechaIso(ex.fecha),
        hasta: fechaIso(ex.fecha),
        detalle: { turnoExtraId: creada.id, tipoTrabajador: input.tipoTrabajador },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "pauta.turno_extra.registrado",
        entidadTipo: "turno_extra",
        entidadId: creada.id,
        payload: { puestoId: ex.puestoId, excepcionId: ex.id },
      });
      return creada;
    });
    return { turno: vistaTurnoExtra(fila) };
  },
});
