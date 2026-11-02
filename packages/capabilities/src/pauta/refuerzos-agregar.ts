import { z } from "zod";

import { serieVigente } from "@opai/domain";

import { uuidSchema } from "../core/esquemas";
import { dondePersona } from "../core/maestros/alcance";
import { sinDuplicado } from "../core/maestros/comun";
import { defineCapability } from "../define";
import { conflicto, noEncontrado } from "../errores";
import { anotar } from "./anotar";
import { aFechaDb, diaSchema, PERMISO_WRITE, puestoParaPauta } from "./comun";
import { validarNoDoblar } from "./doblaje";
import { cargarSeries } from "./cargar";

const inputSchema = z.object({
  puestoId: uuidSchema,
  fecha: diaSchema,
  personaId: uuidSchema,
  motivo: z.string().trim().min(3).max(200),
});

const salidaSchema = z.object({ puestoId: z.string(), fecha: z.string(), personaId: z.string() });

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
    if (repetida) throw conflicto("Ya hay una excepción activa ese día.");
    await validarNoDoblar(ctx, {
      puestoId: puesto.id,
      titularPersonaId: input.personaId,
      patron: vig.patron,
      inicioCiclo: vig.inicioCiclo,
      desde: input.fecha,
      horaInicio: puesto.horaInicio,
      horaFin: puesto.horaFin,
    });
    if (dryRun) return { puestoId: puesto.id, fecha: input.fecha, personaId: input.personaId };
    return ctx.transaccion(async (tx) => {
      await tx.$queryRaw`SELECT id FROM core.puestos WHERE id = ${input.puestoId}::uuid AND tenant_id = ${ctx.tenantId}::uuid FOR UPDATE`;
      await sinDuplicado(
        tx.excepcionPauta.create({
          data: {
            tenantId: ctx.tenantId,
            puestoId: puesto.id,
            fecha: aFechaDb(input.fecha),
            tipo: "refuerzo",
            motivo: input.motivo,
            personaId: input.personaId,
            creadaPor: ctx.usuario?.id ?? null,
          },
        }),
        "Ya hay una excepción activa ese día.",
      );
      await anotar(tx, ctx, {
        instalacionId: puesto.instalacionId,
        puestoId: puesto.id,
        accion: "refuerzo_agregado",
        desde: input.fecha,
        hasta: input.fecha,
        detalle: { personaId: input.personaId },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "pauta.excepcion.creada",
        entidadTipo: "puesto",
        entidadId: puesto.id,
        payload: { puestoId: puesto.id, tipo: "refuerzo", desde: input.fecha, hasta: input.fecha },
      });
      return { puestoId: puesto.id, fecha: input.fecha, personaId: input.personaId };
    });
  },
});
