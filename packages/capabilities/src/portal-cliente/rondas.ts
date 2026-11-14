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
  const cuenta = new Map(instalacionIds.map((id) => [id, { realizadas: 0, completas: 0 }]));
  for (const c of cierres) {
    const k = cuenta.get(c.instalacionId);
    if (!k) continue;
    k.realizadas += 1;
    if (c.estado === "completada" && c.puntosMarcados >= c.puntosObligatorios) k.completas += 1;
  }
  for (const [id, k] of cuenta)
    out.set(id, {
      ...k,
      incompletas: k.realizadas - k.completas,
      porcentaje: k.realizadas === 0 ? null : Math.round((k.completas / k.realizadas) * 1000) / 10,
    });
  return out;
}
