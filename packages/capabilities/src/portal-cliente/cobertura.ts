import { z } from "zod";

import { resumirCobertura } from "@opai/domain";

import { cargarMes } from "../pauta/cargar";
import type { Contexto } from "../types";

/** Cobertura del mes de una instalación para el cliente: solo cifras, nunca personas ni costos (CAR-491). */
export const coberturaSchema = z.object({
  /** Turnos programados del período (hasta hoy si es el mes en curso). */
  programados: z.number().int(),
  cubiertos: z.number().int(),
  /** Turnos programados que quedaron sin cubrir. */
  porCubrir: z.number().int(),
  /** Cubiertos sobre programados, con un decimal; null si no hubo turnos programados. */
  porcentaje: z.number().nullable(),
});
type CoberturaCliente = z.output<typeof coberturaSchema>;

/**
 * Cobertura del mes (aaaa-mm) por instalación, con la misma cuenta que el resumen de la Pauta (series, excepciones,
 * reemplazos y refuerzos). En el mes en curso solo cuentan los días hasta `hoy`: lo que viene todavía no es servicio
 * prestado. Las instalaciones ya vienen filtradas por el alcance del acceso (ADR-022).
 */
export async function coberturaPorInstalacion(
  ctx: Contexto,
  instalaciones: readonly { id: string; region: string | null }[],
  mes: string,
  hoy: string,
): Promise<Map<string, CoberturaCliente>> {
  const ids = instalaciones.map((i) => i.id);
  const out = new Map<string, CoberturaCliente>();
  if (ids.length === 0) return out;
  const puestos = await ctx.db.puesto.findMany({
    where: { estado: "activo", instalacionId: { in: ids } },
    select: { id: true, instalacionId: true },
  });
  const [anio, m] = mes.split("-").map(Number) as [number, number];
  const cargado = await cargarMes(ctx, puestos, instalaciones, anio, m);
  for (const id of ids) {
    const celdas = puestos
      .filter((p) => p.instalacionId === id)
      .flatMap((p) => cargado.celdas.get(p.id) ?? [])
      .filter((c) => c.fecha <= hoy);
    const r = resumirCobertura(celdas);
    out.set(id, { programados: r.programados, cubiertos: r.cubiertos, porCubrir: r.ppc, porcentaje: r.cobertura });
  }
  return out;
}
