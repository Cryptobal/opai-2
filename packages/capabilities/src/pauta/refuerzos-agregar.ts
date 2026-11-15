import { z } from "zod";

import { serieVigente } from "@opai/domain";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { noEncontrado } from "../errores";
import { validarPersonaParaExtra } from "./asignacion-extra-comun";
import { cargarSeries } from "./cargar";
import { diaSchema, PERMISO_WRITE, puestoParaPauta } from "./comun";
import { crearExcepcionConTurnoExtra } from "./excepcion-con-extra";

const inputSchema = z.object({
  puestoId: uuidSchema,
  fecha: diaSchema,
  personaId: uuidSchema,
  motivo: z.string().trim().min(3).max(200),
  tipoTrabajador: z.enum(["propio", "externo"]).default("propio"),
});

const salidaSchema = z.object({
  puestoId: z.string(),
  fecha: z.string(),
  personaId: z.string(),
  turnoExtraId: z.string().nullable(),
});

/** Agrega un refuerzo en un día (incluso libre según la serie). */
export const refuerzosAgregar = defineCapability({
  id: "pauta.refuerzos.agregar",
  descripcion:
    "Agrega un refuerzo en la pauta de un puesto y fecha: crea la excepción de refuerzo con la persona indicada y valida que no doble turnos.",
  permiso: PERMISO_WRITE,
  input: inputSchema,
  output: salidaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const puesto = await puestoParaPauta(ctx, input.puestoId);
    const series = await cargarSeries(ctx, puesto.id);
    const vig = serieVigente(series, input.fecha);
    if (!vig) throw noEncontrado("La serie del puesto");
    await validarPersonaParaExtra(ctx, puesto, {
      personaId: input.personaId,
      fecha: input.fecha,
      vig,
      conflictoMsg: "Ya hay una excepción activa ese día.",
    });
    if (dryRun)
      return { puestoId: puesto.id, fecha: input.fecha, personaId: input.personaId, turnoExtraId: null };
    return ctx.transaccion(async (tx) => {
      await tx.$queryRaw`SELECT id FROM core.puestos WHERE id = ${input.puestoId}::uuid AND tenant_id = ${ctx.tenantId}::uuid FOR UPDATE`;
      const { turnoExtraId } = await crearExcepcionConTurnoExtra(tx, ctx, {
        puesto,
        fecha: input.fecha,
        personaId: input.personaId,
        tipo: "refuerzo",
        motivo: input.motivo,
        tipoTrabajador: input.tipoTrabajador,
        accionHistorial: "refuerzo_agregado",
      });
      return {
        puestoId: puesto.id,
        fecha: input.fecha,
        personaId: input.personaId,
        turnoExtraId,
      };
    });
  },
});
