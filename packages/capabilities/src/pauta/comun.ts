import { z } from "zod";

import { diaNumero, rangoDias } from "@opai/domain";

import { fechaCivilSchema } from "../core/calendario/comun";
import { noEncontrado, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { hoyEn, zonaDelTenant } from "../core/turnos/comun";
import { dondePuesto } from "../core/maestros/alcance";

export const PERMISO_READ = "pauta:read";
export const PERMISO_WRITE = "pauta:write";

/** Hoy como fecha civil "aaaa-mm-dd" en la zona horaria de la empresa (decide qué día es «hoy»). */
export async function hoy(ctx: Contexto, ahora: Date = new Date()): Promise<string> {
  return hoyEn(await zonaDelTenant(ctx), ahora);
}

export const mesSchema = z.object({
  anio: z.number().int().min(2000).max(2100),
  mes: z.number().int().min(1).max(12),
});

/** Fecha civil real: rechaza «2026-02-30», que `Date.parse` normalizaría en silencio. */
export const diaSchema = fechaCivilSchema;

export const rangoSchema = z
  .object({ desde: diaSchema, hasta: diaSchema.optional() })
  .refine((r) => !r.hasta || r.hasta >= r.desde, "«hasta» no puede ser anterior a «desde».");

/** Máximo de días que una sola excepción puede cubrir (vacaciones largas caben). */
export const MAX_DIAS_EXCEPCION = 62;

/** Días de un rango; el tope se valida antes de expandir para no generar millones de fechas. */
export function diasDelRango(desde: string, hasta: string | undefined): string[] {
  const fin = hasta ?? desde;
  if (diaNumero(fin) - diaNumero(desde) + 1 > MAX_DIAS_EXCEPCION)
    throw reglaDeNegocio(`Una excepción cubre como máximo ${MAX_DIAS_EXCEPCION} días seguidos.`);
  return rangoDias(desde, fin);
}

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
