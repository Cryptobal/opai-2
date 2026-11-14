import { z } from "zod";

import { rangoDelPeriodo } from "@opai/domain";

import type { Contexto } from "../types";

/** Rondas del mes de una instalación para el cliente: solo cifras, nunca quién las hizo (CAR-492). */
export const rondasSchema = z.object({
  /** Rondas cerradas en el mes. */
  realizadas: z.number().int(),
  /** Cerradas con todos sus puntos obligatorios marcados. */
  completas: z.number().int(),
  /** Cerradas con puntos obligatorios sin marcar. */
  incompletas: z.number().int(),
  /** Completas sobre realizadas, con un decimal; null si no hubo rondas. */
  porcentaje: z.number().nullable(),
});
type RondasCliente = z.output<typeof rondasSchema>;

/**
 * Rondas cerradas en el mes (aaaa-mm, en la zona de la empresa) por instalación, con la misma regla que el indicador
 * «Rondas completas»: completa = cerrada como completada y con todos sus puntos obligatorios. Las instalaciones ya
 * vienen filtradas por el alcance del acceso (ADR-022).
 */
export async function rondasPorInstalacion(
  ctx: Contexto,
  instalacionIds: readonly string[],
  mes: string,
  zona: string,
): Promise<Map<string, RondasCliente>> {
  const out = new Map<string, RondasCliente>();
  if (instalacionIds.length === 0) return out;
  const { desde, hasta } = rangoDelPeriodo(mes, zona);
  const cierres = await ctx.db.cierreRonda.findMany({
    where: { instalacionId: { in: [...instalacionIds] }, horaCierre: { gte: desde, lt: hasta } },
    select: { instalacionId: true, estado: true, puntosObligatorios: true, puntosMarcados: true },
  });
  for (const id of instalacionIds) {
    const suyas = cierres.filter((c) => c.instalacionId === id);
    const completas = suyas.filter((c) => c.estado === "completada" && c.puntosMarcados >= c.puntosObligatorios).length;
    out.set(id, {
      realizadas: suyas.length,
      completas,
      incompletas: suyas.length - completas,
      porcentaje: suyas.length === 0 ? null : Math.round((completas / suyas.length) * 1000) / 10,
    });
  }
  return out;
}
