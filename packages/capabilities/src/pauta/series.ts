import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { dondePersona } from "../core/maestros/alcance";
import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { sumarDias } from "@opai/domain";
import type { Contexto } from "../types";
import { anotar } from "./anotar";
import { aFechaDb, diaSchema, hoy, puestoParaPauta, PERMISO_WRITE } from "./comun";
import { validarNoDoblar } from "./doblaje";
import { nombresDePersonas } from "./nombres";
import { serieVistaSchema } from "./vistas";

const inputSchema = z.object({
  puestoId: uuidSchema,
  patronId: uuidSchema,
  /** Primer día de trabajo de un ciclo (ancla la fase de 4×4, 7×7…). */
  inicioCiclo: diaSchema,
  /** Persona titular; null deja el puesto sin titular (PPC «sin titular»). */
  titularPersonaId: uuidSchema.nullable(),
  /** Desde cuándo rige la nueva serie. No puede ser anterior a hoy si el puesto ya tenía serie. */
  desde: diaSchema,
});

const salidaSchema = z.object({
  serie: serieVistaSchema,
  /** Último día de la serie anterior, que se cierra el día antes de `desde`; null si no había. */
  serieAnteriorHasta: z.string().nullable(),
  /** Titular al que el sistema avisará del cambio (notificación, sin confirmar). */
  avisarA: z.string().nullable(),
});

type Entrada = z.output<typeof inputSchema>;

/** Valida todo lo que no depende de la escritura y devuelve lo necesario para armar la vista. */
async function planear(ctx: Contexto, i: Entrada) {
  const puesto = await puestoParaPauta(ctx, i.puestoId);
  const patron = await ctx.db.patronTurno.findUnique({ where: { id: i.patronId } });
  if (!patron) throw noEncontrado("El patrón de turno");
  if (!patron.activo) throw reglaDeNegocio(`El patrón «${patron.nombre}» está desactivado.`);
  if (i.titularPersonaId) {
    const ok = await ctx.db.persona.findFirst({
      where: {
        id: i.titularPersonaId,
        AND: [dondePersona(ctx)],
        vinculos: { some: { estado: "vigente", instalacionId: puesto.instalacionId } },
      },
      select: { id: true },
    });
    if (!ok) throw noEncontrado("La persona titular en esta instalación");
  }
  const previas = await ctx.db.seriePauta.count({ where: { puestoId: i.puestoId } });
  // «No modifica días pasados» (R11): con serie previa, el cambio rige desde hoy en adelante.
  if (previas > 0 && i.desde < hoy())
    throw reglaDeNegocio("La nueva serie no puede empezar antes de hoy: no se modifican los días pasados.");
  if (i.titularPersonaId)
    await validarNoDoblar(ctx, {
      puestoId: puesto.id,
      titularPersonaId: i.titularPersonaId,
      patron: {
        clase: patron.clase === "semanal" ? "semanal" : "ciclico",
        diasTrabajo: patron.diasTrabajo,
        diasDescanso: patron.diasDescanso,
        diasSemana: patron.diasSemana,
      },
      inicioCiclo: i.inicioCiclo,
      desde: i.desde,
      horaInicio: puesto.horaInicio,
      horaFin: puesto.horaFin,
    });
  return { puesto, patron };
}

/** Fija la serie de un puesto (patrón, inicio de ciclo y titular) desde una fecha. */
export const seriesFijar = defineCapability({
  id: "pauta.series.fijar",
  descripcion:
    "Fija la serie de un puesto en la pauta: el patrón de turno, el inicio de ciclo y el titular, desde una fecha. Cierra la serie anterior el día antes y no modifica los días pasados. Se replica sola mes a mes según el ciclo.",
  permiso: PERMISO_WRITE,
  input: inputSchema,
  output: salidaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const { puesto, patron } = await planear(ctx, input);
    const nombres = await nombresDePersonas(ctx, [input.titularPersonaId]);
    const titular = input.titularPersonaId ? (nombres.get(input.titularPersonaId) ?? null) : null;
    const vista = (id: string) => ({
      id,
      patronId: patron.id,
      patron: patron.nombre,
      inicioCiclo: input.inicioCiclo,
      titularId: input.titularPersonaId,
      titular,
      desde: input.desde,
      hasta: null,
    });
    const anteriorHasta = sumarDias(input.desde, -1);
    if (dryRun) return { serie: vista(""), serieAnteriorHasta: anteriorHasta, avisarA: titular };
    const fila = await ctx.transaccion(async (tx) => {
      // Un solo cambio de serie a la vez: primero la persona y luego el puesto (siempre en ese orden, sin ciclos): dos cambios que
      // quieran al mismo titular en puestos distintos se serializan y «no doblar» ve el otro cambio.
      if (input.titularPersonaId)
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`pauta:${ctx.tenantId}:${input.titularPersonaId}`}, 0))::text`;
      await tx.$queryRaw`SELECT id FROM core.puestos WHERE id = ${puesto.id}::uuid AND tenant_id = ${ctx.tenantId}::uuid FOR UPDATE`;
      await planear({ ...ctx, db: tx }, input);
      const desde = aFechaDb(input.desde);
      // Las series futuras que esta reemplaza se descartan; el historial deja constancia de cuántas.
      const { count: descartadas } = await tx.seriePauta.deleteMany({
        where: { puestoId: puesto.id, vigenteDesde: { gte: desde } },
      });
      await tx.seriePauta.updateMany({
        where: { puestoId: puesto.id, OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: desde } }] },
        data: { vigenteHasta: aFechaDb(anteriorHasta) },
      });
      const nueva = await tx.seriePauta.create({
        data: {
          tenantId: ctx.tenantId,
          puestoId: puesto.id,
          patronId: patron.id,
          inicioCiclo: aFechaDb(input.inicioCiclo),
          titularPersonaId: input.titularPersonaId,
          vigenteDesde: desde,
          creadaPor: ctx.usuario?.id ?? null,
        },
      });
      await anotar(tx, ctx, {
        instalacionId: puesto.instalacionId,
        puestoId: puesto.id,
        accion: "serie_fijada",
        desde: input.desde,
        hasta: input.desde,
        // Solo datos de la serie: sin persona (el historial lo ve quien tiene `pauta:read`).
        detalle: {
          patron: patron.nombre,
          inicioCiclo: input.inicioCiclo,
          conTitular: input.titularPersonaId ? "si" : "no",
          descartadas,
        },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "pauta.serie.fijada",
        entidadTipo: "puesto",
        entidadId: puesto.id,
        payload: { puestoId: puesto.id, desde: input.desde, titularId: input.titularPersonaId },
      });
      return nueva;
    });
    return { serie: vista(fila.id), serieAnteriorHasta: anteriorHasta, avisarA: titular };
  },
});
