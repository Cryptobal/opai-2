import { z } from "zod";

import { serieVigente, trabajaEn } from "@opai/domain";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { reglaDeNegocio } from "../errores";
import { validarPersonaParaExtra } from "./asignacion-extra-comun";
import { celdaDelDia, cargarSeries } from "./cargar";
import { diaSchema, PERMISO_WRITE, puestoParaPauta } from "./comun";
import { crearExcepcionConTurnoExtra } from "./excepcion-con-extra";

const inputSchema = z.object({
  puestoId: uuidSchema,
  fecha: diaSchema,
  personaId: uuidSchema,
  motivo: z.string().trim().min(3).max(200),
  /** @deprecated CAR-96: el reemplazo siempre deja turno extra por aprobar. */
  turnoExtraPendiente: z.boolean().optional(),
  tipoTrabajador: z.enum(["propio", "externo"]).default("propio"),
});

const salidaSchema = z.object({
  puestoId: z.string(),
  fecha: z.string(),
  personaId: z.string(),
  variante: z.enum(["reemplazo", "refuerzo_extra"]).nullable(),
  turnoExtraId: z.string().nullable(),
});

/** Asigna un reemplazo: crea excepción «reemplazo» y valida que la persona no doble. */
export const reemplazosAsignar = defineCapability({
  id: "pauta.reemplazos.asignar",
  descripcion:
    "Asigna un guardia como reemplazo en un puesto y fecha: crea la excepción de reemplazo, valida no doblar y deja listo el turno extra por aprobar cuando corresponda.",
  permiso: PERMISO_WRITE,
  input: inputSchema,
  output: salidaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const puesto = await puestoParaPauta(ctx, input.puestoId);
    const series = await cargarSeries(ctx, puesto.id);
    const vig = serieVigente(series, input.fecha);
    if (!vig || !trabajaEn(vig.patron, vig.inicioCiclo, input.fecha))
      throw reglaDeNegocio("Solo se reemplaza en un día de turno del puesto.");
    const celda = await celdaDelDia(ctx, puesto.id, input.fecha);
    if (celda.estado !== "ppc")
      throw reglaDeNegocio("Solo se asigna reemplazo cuando el día está como puesto por cubrir.");
    await validarPersonaParaExtra(ctx, puesto, {
      personaId: input.personaId,
      fecha: input.fecha,
      vig,
      conflictoMsg: "Ya hay una excepción activa ese día: anúlala antes de asignar reemplazo.",
    });
    if (dryRun)
      return {
        puestoId: puesto.id,
        fecha: input.fecha,
        personaId: input.personaId,
        variante: "refuerzo_extra" as const,
        turnoExtraId: null,
      };
    return ctx.transaccion(async (tx) => {
      await tx.$queryRaw`SELECT id FROM core.puestos WHERE id = ${input.puestoId}::uuid AND tenant_id = ${ctx.tenantId}::uuid FOR UPDATE`;
      const { turnoExtraId } = await crearExcepcionConTurnoExtra(tx, ctx, {
        puesto,
        fecha: input.fecha,
        personaId: input.personaId,
        tipo: "reemplazo",
        motivo: input.motivo,
        tipoTrabajador: input.tipoTrabajador,
        accionHistorial: "reemplazo_asignado",
      });
      return {
        puestoId: puesto.id,
        fecha: input.fecha,
        personaId: input.personaId,
        variante: "refuerzo_extra" as const,
        turnoExtraId,
      };
    });
  },
});
