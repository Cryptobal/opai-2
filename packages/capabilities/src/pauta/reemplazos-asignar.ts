import { z } from "zod";

import { serieVigente, trabajaEn } from "@opai/domain";

import { uuidSchema } from "../core/esquemas";
import { dondePersona } from "../core/maestros/alcance";
import { sinDuplicado } from "../core/maestros/comun";
import { defineCapability } from "../define";
import { conflicto, noEncontrado, reglaDeNegocio } from "../errores";
import { anotar } from "./anotar";
import { celdaDelDia, cargarSeries } from "./cargar";
import { aFechaDb, diaSchema, PERMISO_WRITE, puestoParaPauta } from "./comun";
import { validarNoDoblar } from "./doblaje";
import { insertarTurnoExtra } from "./turnos-extra-comun";

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
    const ok = await ctx.db.persona.findFirst({
      where: {
        id: input.personaId,
        AND: [dondePersona(ctx)],
        vinculos: { some: { estado: "vigente", instalacionId: puesto.instalacionId } },
      },
      select: { id: true },
    });
    if (!ok) throw noEncontrado("La persona");
    const repetida = await ctx.db.excepcionPauta.findFirst({
      where: { puestoId: puesto.id, fecha: aFechaDb(input.fecha), estado: "activa" },
    });
    if (repetida) throw conflicto("Ya hay una excepción activa ese día: anúlala antes de asignar reemplazo.");
    await validarNoDoblar(ctx, {
      puestoId: puesto.id,
      titularPersonaId: input.personaId,
      patron: vig.patron,
      inicioCiclo: vig.inicioCiclo,
      desde: input.fecha,
      horaInicio: puesto.horaInicio,
      horaFin: puesto.horaFin,
    });
    const variante = "refuerzo_extra" as const;
    if (dryRun)
      return {
        puestoId: puesto.id,
        fecha: input.fecha,
        personaId: input.personaId,
        variante,
        turnoExtraId: null,
      };
    return ctx.transaccion(async (tx) => {
      await tx.$queryRaw`SELECT id FROM core.puestos WHERE id = ${input.puestoId}::uuid AND tenant_id = ${ctx.tenantId}::uuid FOR UPDATE`;
      const ex = await sinDuplicado(
        tx.excepcionPauta.create({
          data: {
            tenantId: ctx.tenantId,
            puestoId: puesto.id,
            fecha: aFechaDb(input.fecha),
            tipo: "reemplazo",
            motivo: input.motivo,
            personaId: input.personaId,
            creadaPor: ctx.usuario?.id ?? null,
          },
        }),
        "Ya hay una excepción activa ese día.",
      );
      const extra = await insertarTurnoExtra(tx, ctx, {
        puestoId: puesto.id,
        instalacionId: puesto.instalacionId,
        fecha: input.fecha,
        personaId: input.personaId,
        excepcionId: ex.id,
        tipoTrabajador: input.tipoTrabajador,
      });
      await anotar(tx, ctx, {
        instalacionId: puesto.instalacionId,
        puestoId: puesto.id,
        accion: "reemplazo_asignado",
        desde: input.fecha,
        hasta: input.fecha,
        detalle: { personaId: input.personaId, turnoExtraId: extra.id },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "pauta.excepcion.creada",
        entidadTipo: "puesto",
        entidadId: puesto.id,
        payload: { puestoId: puesto.id, tipo: "reemplazo", desde: input.fecha, hasta: input.fecha },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "pauta.turno_extra.registrado",
        entidadTipo: "turno_extra",
        entidadId: extra.id,
        payload: { puestoId: puesto.id, excepcionId: ex.id },
      });
      return {
        puestoId: puesto.id,
        fecha: input.fecha,
        personaId: input.personaId,
        variante,
        turnoExtraId: extra.id,
      };
    });
  },
});
