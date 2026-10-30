import { z } from "zod";

import { ESTADOS_COTIZACION, type EstadoCotizacion, PCT_ESCALA, esEditable } from "@opai/domain";

import { noEncontrado, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";

export const PERMISO_READ = "cpq:cotizaciones.read";
export const PERMISO_MANAGE = "cpq:cotizaciones.manage";
/** Ver costo, margen, sueldos y semáforo (R59): se aplica en el servidor, en los tres bordes. */
export const PERMISO_COSTOS = "cpq:costos.ver";
export const PERMISO_APROBAR = "cpq:aprobar";
export const PERMISO_MODELO = "cpq:modelo.manage";

export const MODOS_MARGEN = ["margen_sobre_venta", "markup", "margen_sobre_mano_de_obra"] as const;
export const MONEDAS = ["CLP", "UF"] as const;

/**
 * Defectos mientras no exista la pestaña Pólizas y finanzas / Márgenes (PR 10.3 y 10.7): validez de
 * 30 días (pregunta 10), moneda UF (R62, «UF para Gard») y margen igual al mínimo de Gard, 10 % sobre
 * venta (R35, decidido (6)). Toda cotización los puede cambiar con `cpq.cotizaciones.ajustar`.
 */
export const DEFECTOS = {
  validezDias: 30,
  moneda: "UF" as (typeof MONEDAS)[number],
  modoMargen: "margen_sobre_venta" as (typeof MODOS_MARGEN)[number],
  margenObjetivo: (10 * PCT_ESCALA) / 100,
};

export const estadoSchema = z.enum(ESTADOS_COTIZACION);
export const monedaSchema = z.enum(MONEDAS);
export const modoMargenSchema = z.enum(MODOS_MARGEN);
/** Porcentaje escalado por PCT_ESCALA: 0 ≤ m < 100 % en pantalla, API y MCP (§4). */
export const pctSchema = z.number().int().min(0).lt(PCT_ESCALA);
export const clpSchema = z.number().int().min(0).max(10_000_000_000);
export const tituloSchema = z.string().trim().min(3).max(160);

/** Si el actor ve costos, margen y sueldos (R59). Sin el permiso, las vistas omiten esos campos. */
export const veCostos = (ctx: Contexto): boolean => ctx.autorizar(PERMISO_COSTOS);

/**
 * Cotización del tenant o NOT_FOUND. La RLS ya acota al tenant: una de otra empresa responde igual
 * que una inexistente (sin enumeración). En la v1 quien ve Comercial ve todas las del tenant (§7).
 */
export async function cotizacionDe(ctx: Contexto, id: string) {
  const c = await ctx.db.cotizacion.findUnique({ where: { id } });
  if (!c) throw noEncontrado("La cotización");
  return c;
}

/** Última versión de una cotización (la editable, si la hay: solo hay una, R43). */
export async function ultimaVersion(ctx: Contexto, cotizacionId: string) {
  const v = await ctx.db.versionCotizacion.findFirst({
    where: { cotizacionId },
    orderBy: { numero: "desc" },
  });
  if (!v) throw noEncontrado("La versión");
  return v;
}

/** La versión editable (borrador, en aprobación o lista); si no la hay, la regla de R43. */
export function exigirEditable(estado: string): EstadoCotizacion {
  const e = estadoSchema.parse(estado);
  if (!esEditable(e))
    throw reglaDeNegocio(
      `La versión está ${e} y no se edita: crea una versión nueva para cambiarla (R43).`,
    );
  return e;
}

/** Fecha `AAAA-MM-DD` y su año en la zona del tenant (para el código CPQ-AAAA-NNN y la validez). */
export function hoyEn(zona: string, ahora = new Date()): { dia: string; anio: number } {
  const dia = new Intl.DateTimeFormat("en-CA", { timeZone: zona }).format(ahora);
  return { dia, anio: Number(dia.slice(0, 4)) };
}

export async function zonaDelTenant(ctx: Contexto): Promise<string> {
  const t = await ctx.db.tenant.findUnique({ where: { id: ctx.tenantId } });
  return t?.timezone ?? "America/Santiago";
}

export const sumarDias = (dia: string, n: number): Date =>
  new Date(Date.parse(`${dia}T00:00:00Z`) + n * 86_400_000);
