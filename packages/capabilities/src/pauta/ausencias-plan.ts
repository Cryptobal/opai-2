import { z } from "zod";

import { serieVigente, trabajaEn } from "@opai/domain";

import { uuidSchema } from "../core/esquemas";
import { dondePersona, dondePuesto } from "../core/maestros/alcance";
import { conflicto, noEncontrado, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { cargarSeriesDe } from "./cargar";
import { aFechaDb, diasDelRango, fechaIso, rangoSchema } from "./comun";
import { tipoExcepcionSchema } from "./vistas";

/** Persona, tipo, motivo y rango: lo que se registra desde la ficha (ADR-094, adenda CAR-311 d). */
export const ausenciaPersonaInput = z
  .object({
    personaId: uuidSchema,
    tipo: tipoExcepcionSchema,
    motivo: z
      .string()
      .trim()
      .min(3, "Cuenta brevemente el motivo.")
      .max(200)
      .describe("Sin diagnósticos ni datos médicos."),
  })
  .and(rangoSchema);
export type AusenciaPersona = z.output<typeof ausenciaPersonaInput>;

/** Una persona en el alcance del actor (ADR-022), o NOT_FOUND sin enumerar. */
export async function personaParaAusencia(ctx: Contexto, id: string) {
  const p = await ctx.db.persona.findFirst({
    where: { id, AND: [dondePersona(ctx)] },
    select: { id: true },
  });
  if (!p) throw noEncontrado("La persona");
  return p;
}

export type PlanPuesto = {
  puesto: { id: string; nombre: string; instalacionId: string; instalacion: string };
  dias: string[];
};

/**
 * Los turnos de la persona en el rango: por cada puesto donde es titular según la serie vigente de cada día, los
 * días que trabaja. Rechaza si no tiene turnos o si alguno ya tiene una excepción activa (se anula antes).
 */
export async function planearAusencia(
  ctx: Contexto,
  i: AusenciaPersona,
  exigirTurnos = true,
): Promise<PlanPuesto[]> {
  await personaParaAusencia(ctx, i.personaId);
  const fechas = diasDelRango(i.desde, i.hasta);
  const conSerie = await ctx.db.seriePauta.findMany({
    where: { titularPersonaId: i.personaId },
    select: { puestoId: true },
  });
  const puestos = await ctx.db.puesto.findMany({
    where: {
      id: { in: [...new Set(conSerie.map((s) => s.puestoId))] },
      estado: "activo",
      AND: [dondePuesto(ctx)],
    },
    select: {
      id: true,
      nombre: true,
      instalacionId: true,
      instalacion: { select: { nombre: true } },
    },
    orderBy: { id: "asc" },
  });
  // Alcance (ADR-022): si es titular en un puesto que el actor no gestiona, no se registra a medias.
  const activos = await ctx.db.puesto.count({
    where: { id: { in: [...new Set(conSerie.map((s) => s.puestoId))] }, estado: "activo" },
  });
  if (activos > puestos.length)
    throw reglaDeNegocio("La persona tiene turnos en instalaciones fuera de tu alcance.");
  const series = await cargarSeriesDe(
    ctx,
    puestos.map((p) => p.id),
  );
  const plan = puestos.flatMap((p) => {
    const s = series.get(p.id) ?? [];
    const dias = fechas.filter((f) => {
      const v = serieVigente(s, f);
      return v?.titularId === i.personaId && trabajaEn(v.patron, v.inicioCiclo, f);
    });
    const puesto = {
      id: p.id,
      nombre: p.nombre,
      instalacionId: p.instalacionId,
      instalacion: p.instalacion.nombre,
    };
    return dias.length ? [{ puesto, dias }] : [];
  });
  if (plan.length === 0) {
    // Sin turnos: la ficha del Núcleo igual registra la ausencia (CAR-393); la de la pauta la rechaza.
    if (!exigirTurnos) return [];
    throw reglaDeNegocio("La persona no tiene turnos en la pauta en esas fechas.");
  }
  const repetida = await ctx.db.excepcionPauta.findFirst({
    where: {
      estado: "activa",
      OR: plan.map((p) => ({ puestoId: p.puesto.id, fecha: { in: p.dias.map(aFechaDb) } })),
    },
    select: { fecha: true },
  });
  if (repetida)
    throw conflicto(
      `Ya hay una excepción activa el ${fechaIso(repetida.fecha)}: anúlala antes de registrar otra.`,
    );
  return plan;
}
