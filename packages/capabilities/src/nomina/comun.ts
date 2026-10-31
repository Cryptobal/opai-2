import { z } from "zod";

import {
  ESTADOS_PERIODO,
  ESTADOS_OBLIGACION,
  TIPOS_NOVEDAD,
  TIPOS_OBLIGACION,
  fechaCierrePrevista,
  limitesPeriodo,
} from "@opai/domain";

import { aFecha, dia } from "../core/maestros/comun";
import { ajuste } from "../core/config";
import { noEncontrado } from "../errores";
import type { Contexto } from "../types";

// Permisos del módulo Nómina (nomina.md §7). Las lecturas con datos de remuneraciones de una persona
// (novedades, préstamos) son sensibles: se auditan por IDs revelados (NÚCLEO-H). El bloqueo
// financiero de AGENTS/permisos.ts (`nomina:*`) ya deja fuera a gerente, supervisor y viewer.
export const PERMISO_READ = "nomina:read";
export const PERMISO_PERIODOS = "nomina:periodos.manage";
export const PERMISO_PAGAR = "nomina:periodos.pagar";
export const PERMISO_NOVEDADES_READ = "nomina:novedades.read";
export const PERMISO_NOVEDADES = "nomina:novedades.manage";
export const PERMISO_PRESTAMOS_READ = "nomina:prestamos.read";
export const PERMISO_PRESTAMOS = "nomina:prestamos.manage";
export const PERMISO_ANTICIPOS = "nomina:anticipos.manage";
export const PERMISO_OBLIGACIONES = "nomina:obligaciones.manage";
export { PERMISO_CONFIG } from "./ajustes";

export const periodoSchema = z.object({
  id: z.string(),
  anio: z.number().int(),
  mes: z.number().int(),
  etiqueta: z.string(),
  estado: z.enum(ESTADOS_PERIODO),
  inicio: z.string(),
  fin: z.string(),
  cierrePrevisto: z.string(),
  cerradoEn: z.string().nullable(),
  pagadoEn: z.string().nullable(),
  motivoReapertura: z.string().nullable(),
  novedades: z.number().int().describe("Novedades vigentes del período."),
});
export const tipoNovedadSchema = z.enum(TIPOS_NOVEDAD);
export const tipoObligacionSchema = z.enum(TIPOS_OBLIGACION);
export const estadoObligacionSchema = z.enum(ESTADOS_OBLIGACION);

/** Un período de esta empresa, o NOT_FOUND. */
export async function periodoDe(ctx: Contexto, id: string) {
  const p = await ctx.db.nominaPeriodo.findUnique({ where: { id } });
  if (!p) throw noEncontrado("El período");
  return p;
}

/** La persona existe en esta empresa (la RLS ya acota por tenant). */
export async function personaDe(ctx: Contexto, id: string) {
  const p = await ctx.db.persona.findUnique({ where: { id } });
  if (!p) throw noEncontrado("La persona");
  return p;
}

/** El documento de respaldo existe en esta empresa. Su contenido se lee por `core.documentos.*`. */
export async function documentoExiste(ctx: Contexto, id: string): Promise<void> {
  const d = await ctx.db.documento.findUnique({ where: { id }, select: { id: true } });
  if (!d) throw noEncontrado("El documento de respaldo");
}

/** Lee un ajuste con su defecto de fábrica si el registro de ajustes no está cargado (tests). */
export async function ajusteNum(ctx: Contexto, clave: string, defecto: number): Promise<number> {
  try {
    const v = await ajuste<number>(ctx, "nomina", clave);
    return typeof v === "number" ? v : defecto;
  } catch {
    return defecto;
  }
}

/** Fechas de un período nuevo a partir del día de cierre configurado. */
export async function fechasPeriodo(ctx: Contexto, anio: number, mes: number) {
  const { inicio, fin } = limitesPeriodo(anio, mes);
  const cierre = fechaCierrePrevista(anio, mes, await ajusteNum(ctx, "dia_cierre", 31));
  return { inicio: aFecha(inicio), fin: aFecha(fin), cierrePrevisto: aFecha(cierre) };
}

export const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
export { dia };
