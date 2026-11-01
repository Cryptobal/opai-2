import type { z } from "zod";

import type { Contexto } from "@opai/capabilities";
import { noEncontrado } from "@opai/capabilities";

import { PERMISO_COSTOS } from "./permisos";
import type { cotizacionSchema, versionSchema } from "./esquemas";

/** Id de relleno de las vistas previas (dry_run): no existe fila, pero cumple el esquema de salida. */
export const ID_VISTA_PREVIA = "00000000-0000-0000-0000-000000000000";

type FilaVersion = {
  id: string;
  numero: number;
  estado: string;
  moneda: string;
  validaHasta: Date | null;
  ventaMensualClp: number | null;
  enviadaEn: Date | null;
  margenModo: string;
  margenObjetivoPct: number | null;
};

/** Versión tal como sale por los tres bordes: el margen solo con `cpq:costos.ver` (R59, CA15). */
export function vistaVersion(ctx: Contexto, v: FilaVersion): z.infer<typeof versionSchema> {
  const base = {
    id: v.id,
    numero: v.numero,
    estado: v.estado as z.infer<typeof versionSchema>["estado"],
    moneda: v.moneda as z.infer<typeof versionSchema>["moneda"],
    validaHasta: v.validaHasta ? v.validaHasta.toISOString().slice(0, 10) : null,
    ventaMensualClp: v.ventaMensualClp,
    enviadaEn: v.enviadaEn,
  };
  return ctx.autorizar(PERMISO_COSTOS)
    ? { ...base, margen: { modo: v.margenModo, objetivoPct: v.margenObjetivoPct } }
    : base;
}

export function vistaCotizacion(
  c: z.infer<typeof cotizacionSchema>,
): z.infer<typeof cotizacionSchema> {
  return {
    id: c.id,
    codigo: c.codigo,
    negocioId: c.negocioId,
    titulo: c.titulo,
    alternativaDeId: c.alternativaDeId,
    vigente: c.vigente,
    creadoPorId: c.creadoPorId,
    createdAt: c.createdAt,
  };
}

/** Cotización del tenant actual; otra empresa o inexistente da el mismo NOT_FOUND (ADR-022). */
export async function cotizacionDe(ctx: Contexto, id: string) {
  const c = await ctx.db.cpqCotizacion.findFirst({ where: { id } });
  if (!c) throw noEncontrado("La cotización");
  return c;
}
