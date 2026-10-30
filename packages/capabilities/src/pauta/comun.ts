import { z } from "zod";

import { diaSchema } from "../core/maestros/comun";
import { noEncontrado } from "../errores";
import type { Contexto } from "../types";
import { dondePuesto } from "../core/maestros/alcance";

export const PERMISO_READ = "pauta:read";
export const PERMISO_WRITE = "pauta:write";

/** Zona civil por defecto de Gard hasta que el tenant fije la suya: decide qué día es «hoy». */
const ZONA = "America/Santiago";

/** Hoy como fecha civil "aaaa-mm-dd" en la zona del negocio. */
export function hoy(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(ahora);
}

export const mesSchema = z.object({
  anio: z.number().int().min(2000).max(2100),
  mes: z.number().int().min(1).max(12),
});

export const rangoSchema = z
  .object({ desde: diaSchema, hasta: diaSchema.optional() })
  .refine((r) => !r.hasta || r.hasta >= r.desde, "«hasta» no puede ser anterior a «desde».");

/** Máximo de días que una sola excepción puede cubrir (vacaciones largas caben). */
export const MAX_DIAS_EXCEPCION = 62;

/** Un puesto activo del tenant dentro del alcance del actor (ADR-022), o NOT_FOUND sin enumerar. */
export async function puestoParaPauta(ctx: Contexto, id: string) {
  const p = await ctx.db.puesto.findFirst({
    where: { id, estado: "activo", AND: [dondePuesto(ctx)] },
    select: {
      id: true,
      nombre: true,
      instalacionId: true,
      horaInicio: true,
      horaFin: true,
      jornada: true,
    },
  });
  if (!p) throw noEncontrado("El puesto");
  return p;
}

/** Cada fecha civil de un `Date` de columna `@db.Date`. */
export const fechaIso = (d: Date): string => d.toISOString().slice(0, 10);
export const aFechaDb = (d: string): Date => new Date(`${d}T00:00:00.000Z`);
