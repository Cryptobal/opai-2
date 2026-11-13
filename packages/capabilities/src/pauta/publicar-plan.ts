import { z } from "zod";

import { serieVigente, trabajaEn } from "@opai/domain";

import { uuidSchema } from "../core/esquemas";
import { dondeInstalacion, dondePuesto } from "../core/maestros/alcance";
import { noEncontrado } from "../errores";
import type { Contexto } from "../types";
import { cargarSeriesDe } from "./cargar";
import { aFechaDb, fechaIso } from "./comun";

/** Instalación y mes (aaaa-mm) que se publican (CAR-356). */
export const publicacionInput = z.object({
  instalacionId: uuidSchema,
  mes: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "El mes va como aaaa-mm.")
    .describe("Mes de la pauta, aaaa-mm."),
});
export type PublicacionInput = z.output<typeof publicacionInput>;

export type TurnosPersona = { personaId: string; dias: string[] };

/** Días del mes `aaaa-mm` en orden. */
export function diasDelMes(mes: string): string[] {
  const [a, m] = mes.split("-").map(Number) as [number, number];
  const total = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return Array.from({ length: total }, (_, i) => `${mes}-${String(i + 1).padStart(2, "0")}`);
}

/**
 * Los turnos de cada titular en la instalación y el mes: por cada puesto activo, los días que trabaja según la serie
 * vigente de ese día, sin los días con una excepción activa (ausencia, reemplazo…). Alcance del actor en la consulta
 * (ADR-022): una instalación fuera de su alcance da NOT_FOUND sin enumerar.
 */
export async function planearPublicacion(ctx: Contexto, i: PublicacionInput) {
  const inst = await ctx.db.instalacion.findFirst({
    where: { id: i.instalacionId, AND: [dondeInstalacion(ctx)] },
    select: { id: true, nombre: true },
  });
  if (!inst) throw noEncontrado("La instalación");
  const puestos = await ctx.db.puesto.findMany({
    where: { instalacionId: inst.id, estado: "activo", AND: [dondePuesto(ctx)] },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  const ids = puestos.map((p) => p.id);
  const fechas = diasDelMes(i.mes);
  const series = await cargarSeriesDe(ctx, ids);
  const excepciones = ids.length
    ? await ctx.db.excepcionPauta.findMany({
        where: {
          estado: "activa",
          puestoId: { in: ids },
          fecha: { gte: aFechaDb(fechas[0] ?? ""), lte: aFechaDb(fechas.at(-1) ?? "") },
        },
        select: { puestoId: true, fecha: true },
      })
    : [];
  const conExcepcion = new Set(excepciones.map((e) => `${e.puestoId}|${fechaIso(e.fecha)}`));
  const porPersona = new Map<string, Set<string>>();
  for (const id of ids) {
    const s = series.get(id) ?? [];
    for (const f of fechas) {
      const v = serieVigente(s, f);
      if (!v?.titularId || !trabajaEn(v.patron, v.inicioCiclo, f)) continue;
      if (conExcepcion.has(`${id}|${f}`)) continue;
      const dias = porPersona.get(v.titularId) ?? new Set<string>();
      dias.add(f);
      porPersona.set(v.titularId, dias);
    }
  }
  const personas: TurnosPersona[] = [...porPersona]
    .map(([personaId, dias]) => ({ personaId, dias: [...dias].sort() }))
    .sort((a, b) => a.personaId.localeCompare(b.personaId));
  return { instalacion: inst, personas };
}
