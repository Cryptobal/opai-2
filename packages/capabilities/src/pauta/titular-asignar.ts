import { z } from "zod";

import type { TenantTx } from "@opai/db";
import { rangoDias, sumarDias, trabajaEn } from "@opai/domain";

import { uuidSchema } from "../core/esquemas";
import { bloquearNoAnonimizado } from "../core/maestros/anonimizado";
import { dondePuesto } from "../core/maestros/alcance";
import { vistaVinculo } from "../core/maestros/vinculos-vista";
import { defineCapability } from "../define";
import { conflicto, noEncontrado, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { aFechaDb, diaSchema, fechaIso, PERMISO_WRITE, puestoParaPauta } from "./comun";
import { nombresDePersonas } from "./nombres";
import { fijarSerieInterna, salidaSerieSchema } from "./series-nucleo";

const DIAS_VISTA_PREVIA = 14;

const entradaSchema = z.object({
  puestoId: uuidSchema,
  /** Guardia con vínculo vigente en la instalación; null quita al titular (el puesto queda PPC). */
  titularPersonaId: uuidSchema.nullable(),
  /** Desde cuándo rige. Si el puesto ya tenía serie, no puede ser anterior a hoy (R11). */
  desde: diaSchema,
  /** Primer día de trabajo de un ciclo; obligatorio al asignar. Al quitar se conserva el de la serie anterior. */
  inicioCiclo: diaSchema.optional(),
});

const salidaSchema = salidaSerieSchema.extend({
  /** Titular que deja el puesto (el de la serie que se cierra); null si no había. */
  titularAnterior: z.object({ id: z.string(), nombre: z.string() }).nullable(),
  /** Primeros días de la serie nueva, desde «Rige desde»: true = turno de trabajo. */
  primerosDias: z.array(z.object({ fecha: z.string(), trabaja: z.boolean() })),
});

/** Serie que rige en `desde` (la última que empezó hasta ese día): la que se cierra o se reemplaza. */
async function serieAnterior(ctx: Contexto, puestoId: string, desde: string) {
  return ctx.db.seriePauta.findFirst({
    where: { puestoId, vigenteDesde: { lte: aFechaDb(desde) } },
    orderBy: { vigenteDesde: "desc" },
  });
}

/** Un guardia con una serie abierta en otro puesto no puede figurar también en este (traslados: CAR-207). */
async function exigirSinOtroPuesto(ctx: Contexto, puestoId: string, personaId: string, desde: string) {
  const otra = await ctx.db.seriePauta.findFirst({
    where: {
      titularPersonaId: personaId,
      puestoId: { not: puestoId },
      OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: aFechaDb(desde) } }],
    },
    select: { puestoId: true },
  });
  if (!otra) return;
  const visible = await ctx.db.puesto.findFirst({
    where: { id: otra.puestoId, AND: [dondePuesto(ctx)] },
    select: { nombre: true },
  });
  throw reglaDeNegocio(
    `Esa persona ya es titular de ${visible ? `«${visible.nombre}»` : "otro puesto"}: quítala de ahí primero o usa el traslado.`,
  );
}

/** Mueve el puesto del vínculo (nuevo titular, o los que apuntaban al puesto) y avisa por evento. */
async function moverVinculos(
  tx: TenantTx,
  ctx: Contexto,
  p: { puestoId: string; instalacionId: string; titularId: string | null },
) {
  const cambiar = async (id: string, puestoId: string | null) => {
    const antes = await tx.vinculoLaboral.findUniqueOrThrow({ where: { id } });
    if (antes.puestoId === puestoId) return;
    const despues = await tx.vinculoLaboral.update({ where: { id }, data: { puestoId } });
    // Mismo evento que `core.vinculos.update`: el cambio de puesto puede mover la capa de sueldo (R11).
    await ctx.eventos.emitir(tx, {
      tipo: "core.vinculo.actualizado",
      entidadTipo: "vinculo",
      entidadId: id,
      payload: { personaId: antes.personaId, antes: vistaVinculo(antes), despues: vistaVinculo(despues), campos: ["puestoId"] },
    });
  };
  const salientes = await tx.vinculoLaboral.findMany({
    where: { puestoId: p.puestoId, estado: "vigente", ...(p.titularId ? { personaId: { not: p.titularId } } : {}) },
    select: { id: true },
  });
  for (const s of salientes) await cambiar(s.id, null);
  if (!p.titularId) return;
  await bloquearNoAnonimizado(tx, "persona", p.titularId);
  const propios = await tx.vinculoLaboral.findMany({
    where: { personaId: p.titularId, estado: "vigente", instalacionId: p.instalacionId },
    select: { id: true },
  });
  if (propios.length !== 1) throw conflicto("El vínculo de la persona cambió: vuelve a abrir el puesto.");
  await cambiar(propios[0]!.id, p.puestoId);
}

/** Asigna (o quita) el titular de un puesto desde una fecha, en una sola transacción con su serie y su vínculo. */
export const titularAsignar = defineCapability({
  id: "pauta.titular.asignar",
  descripcion:
    "Asigna el titular de un puesto desde una fecha: fija la serie de la pauta (cierra la anterior el día antes), deja al guardia con ese puesto en su vínculo y suelta al titular anterior. Con titular nulo lo quita y el puesto queda por cubrir. La vista previa muestra la serie que se cierra, los primeros días y los choques por doblar turnos.",
  permiso: PERMISO_WRITE,
  input: entradaSchema,
  output: salidaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const puesto = await puestoParaPauta(ctx, input.puestoId);
    const titularId = input.titularPersonaId;
    const anterior = await serieAnterior(ctx, puesto.id, input.desde);
    if (titularId && !puesto.patronId)
      throw reglaDeNegocio("El puesto no tiene patrón de turno: elígelo al editar el puesto antes de asignar un titular.");
    if (!titularId && !anterior?.titularPersonaId) throw reglaDeNegocio("El puesto ya está sin titular.");
    const patronId = titularId ? puesto.patronId : anterior?.patronId;
    const inicioCiclo = input.inicioCiclo ?? (!titularId && anterior ? fechaIso(anterior.inicioCiclo) : undefined);
    if (!patronId || !inicioCiclo) throw reglaDeNegocio("Falta el inicio de ciclo.");
    const patron = await ctx.db.patronTurno.findUnique({ where: { id: patronId } });
    if (!patron) throw noEncontrado("El patrón de turno");
    const nombres = await nombresDePersonas(ctx, [anterior?.titularPersonaId ?? null]);
    const base = await fijarSerieInterna(
      ctx,
      { puestoId: puesto.id, patronId, inicioCiclo, titularPersonaId: titularId, desde: input.desde },
      {
        dryRun,
        detalle: { via: titularId ? "titular_asignar" : "titular_quitar" },
        validar: async (c) => {
          if (titularId) await exigirSinOtroPuesto(c, puesto.id, titularId, input.desde);
        },
        enTransaccion: async (tx, c) => {
          await moverVinculos(tx, c, { puestoId: puesto.id, instalacionId: puesto.instalacionId, titularId });
          await tx.puesto.update({
            where: { id: puesto.id },
            data: { cobertura: titularId ? "cubierto" : "ppc", coberturaMotivo: titularId ? null : "sin_asignar" },
          });
        },
      },
    );
    const patronPauta = {
      clase: patron.clase === "semanal" ? ("semanal" as const) : ("ciclico" as const),
      diasTrabajo: patron.diasTrabajo,
      diasDescanso: patron.diasDescanso,
      diasSemana: patron.diasSemana,
    };
    const anteriorId = anterior?.titularPersonaId ?? null;
    return {
      ...base,
      // Sin serie previa no se cierra nada: el campo solo dice lo que cambió.
      serieAnteriorHasta: anterior ? base.serieAnteriorHasta : null,
      titularAnterior: anteriorId ? { id: anteriorId, nombre: nombres.get(anteriorId) ?? "Titular anterior" } : null,
      primerosDias: rangoDias(input.desde, sumarDias(input.desde, DIAS_VISTA_PREVIA - 1)).map((fecha) => ({
        fecha,
        trabaja: trabajaEn(patronPauta, inicioCiclo, fecha),
      })),
    };
  },
});
