import { z } from "zod";

import { GRAVEDADES, MODOS_PUNTO, ORDENES_PLANTILLA, RADIO_GEOCERCA_M } from "@opai/domain";

import { ajuste } from "../core/config";
import { instalacionesEnAlcance } from "../core/maestros/alcance";
import { noEncontrado } from "../errores";
import type { Contexto } from "../types";

export const PERMISO_READ = "rondas:read";
export const PERMISO_CONFIG = "rondas:configurar";
export const PERMISO_CONFIANZA = "rondas:confianza.manage";

export const modoSchema = z.enum(MODOS_PUNTO);
export const ordenSchema = z.enum(ORDENES_PLANTILLA);
export const gravedadSchema = z.enum(GRAVEDADES);

/** Defectos de fábrica, iguales a los `.default()` de los ajustes del módulo (ADR-021). */
export const DEFECTOS = {
  radio_defecto_m: RADIO_GEOCERCA_M.defecto,
  precision_min_defecto_m: 25,
  permanencia_gps_defecto_s: 15,
  modo_defecto: "qr_gps",
} as const;

/**
 * Lee un ajuste del tenant con fallback al defecto de fábrica. En producción el módulo está
 * registrado y `ajuste()` devuelve el valor efectivo del tenant; en los tests de capacidades el
 * registro de ajustes no está cargado y cae al defecto, que es el mismo valor (ADR-021, R1/R6).
 */
export async function defecto<T>(ctx: Contexto, clave: keyof typeof DEFECTOS): Promise<T> {
  try {
    const v = await ajuste<T>(ctx, "rondas", clave);
    return (v ?? (DEFECTOS[clave] as unknown as T)) as T;
  } catch {
    return DEFECTOS[clave] as unknown as T;
  }
}

/** Fragmento `where` que acota una tabla con `instalacion_id` al alcance del actor (ADR-022, R29). */
export function dondeInstalacionId(ctx: Contexto): { instalacionId?: { in: string[] } } {
  const ids = instalacionesEnAlcance(ctx);
  return ids ? { instalacionId: { in: [...ids] } } : {};
}

/**
 * La instalación existe en esta empresa y está en el alcance del actor (ADR-022). Una instalación
 * fuera del alcance responde igual que una inexistente, sin revelar que existe (sin enumeración).
 */
export async function instalacionEnAlcance(ctx: Contexto, instalacionId: string): Promise<void> {
  const ids = instalacionesEnAlcance(ctx);
  const inst = await ctx.db.instalacion.findFirst({
    where: ids ? { id: instalacionId, AND: [{ id: { in: [...ids] } }] } : { id: instalacionId },
    select: { id: true },
  });
  if (!inst) throw noEncontrado("La instalación");
}

/** Un punto del tenant dentro del alcance del actor, o NOT_FOUND. */
export async function puntoDe(ctx: Contexto, id: string) {
  const p = await ctx.db.puntoControl.findFirst({
    where: { id, ...dondeInstalacionId(ctx) },
  });
  if (!p) throw noEncontrado("El punto de control");
  return p;
}

/** Una plantilla del tenant dentro del alcance del actor, o NOT_FOUND. */
export async function plantillaDe(ctx: Contexto, id: string) {
  const pl = await ctx.db.plantillaRonda.findFirst({
    where: { id, ...dondeInstalacionId(ctx) },
  });
  if (!pl) throw noEncontrado("La plantilla");
  return pl;
}

/** Un tipo de incidente del tenant (catálogo, no se acota por instalación), o NOT_FOUND. */
export async function tipoIncidenteDe(ctx: Contexto, id: string) {
  const t = await ctx.db.tipoIncidente.findUnique({ where: { id } });
  if (!t) throw noEncontrado("El tipo de incidente");
  return t;
}
