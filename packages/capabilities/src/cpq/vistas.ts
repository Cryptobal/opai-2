import { z } from "zod";

import { estadoSchema, monedaSchema, modoMargenSchema } from "./comun";

// Vistas de salida de CPQ. Los campos de costo (costo, margen y su porcentaje, sueldos, costos
// unitarios, margen propio) son opcionales y SOLO se incluyen si el actor tiene `cpq:costos.ver`
// (R59): el filtro está en el servidor, así que vale igual para la pantalla, /api/v1 y el MCP.

const dia = (d: Date | null): string | null => (d ? d.toISOString().slice(0, 10) : null);
const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

export const resumenSchema = z.object({
  id: z.string(),
  codigo: z.string(),
  titulo: z.string(),
  negocioId: z.string(),
  estado: estadoSchema,
  vigente: z.boolean(),
  alternativaDeId: z.string().nullable(),
  version: z.number(),
  moneda: monedaSchema,
  validaHasta: z.string(),
  ventaMensual: z.number().nullable(),
  pagosUnicos: z.number().nullable(),
  creadaEn: z.string(),
  costoMensual: z.number().nullable().optional(),
  margenEfectivo: z.number().nullable().optional(),
});

type FilaCotizacion = {
  id: string;
  codigo: string;
  titulo: string;
  negocioId: string;
  estado: string;
  vigente: boolean;
  alternativaDeId: string | null;
  createdAt: Date;
};
export type FilaVersion = {
  id: string;
  numero: number;
  estado: string;
  moneda: string;
  validaHasta: Date;
  modoMargen: string;
  margenObjetivo: number;
  precioManual: number | null;
  ventaMensual: number | null;
  pagosUnicos: number | null;
  costoMensual: number | null;
  margenEfectivo: number | null;
  ufValor: number | null;
  ufFecha: Date | null;
  revision: number;
  enviadaEn: Date | null;
};

export function vistaResumen(c: FilaCotizacion, v: FilaVersion, costos: boolean) {
  return {
    id: c.id,
    codigo: c.codigo,
    titulo: c.titulo,
    negocioId: c.negocioId,
    estado: estadoSchema.parse(c.estado),
    vigente: c.vigente,
    alternativaDeId: c.alternativaDeId,
    version: v.numero,
    moneda: monedaSchema.parse(v.moneda),
    validaHasta: dia(v.validaHasta) ?? "",
    ventaMensual: v.ventaMensual,
    pagosUnicos: v.pagosUnicos,
    creadaEn: c.createdAt.toISOString(),
    ...(costos ? { costoMensual: v.costoMensual, margenEfectivo: v.margenEfectivo } : {}),
  };
}

export const versionSchema = z.object({
  id: z.string(),
  numero: z.number(),
  estado: estadoSchema,
  moneda: monedaSchema,
  validaHasta: z.string(),
  precioManual: z.number().nullable(),
  ventaMensual: z.number().nullable(),
  pagosUnicos: z.number().nullable(),
  ufValor: z.number().nullable(),
  ufFecha: z.string().nullable(),
  revision: z.number(),
  enviadaEn: z.string().nullable(),
  modoMargen: modoMargenSchema.optional(),
  margenObjetivo: z.number().optional(),
  costoMensual: z.number().nullable().optional(),
  margenEfectivo: z.number().nullable().optional(),
});

export function vistaVersion(v: FilaVersion, costos: boolean) {
  return {
    id: v.id,
    numero: v.numero,
    estado: estadoSchema.parse(v.estado),
    moneda: monedaSchema.parse(v.moneda),
    validaHasta: dia(v.validaHasta) ?? "",
    precioManual: v.precioManual,
    ventaMensual: v.ventaMensual,
    pagosUnicos: v.pagosUnicos,
    ufValor: v.ufValor,
    ufFecha: dia(v.ufFecha),
    revision: v.revision,
    enviadaEn: iso(v.enviadaEn),
    ...(costos
      ? {
          modoMargen: modoMargenSchema.parse(v.modoMargen),
          margenObjetivo: v.margenObjetivo,
          costoMensual: v.costoMensual,
          margenEfectivo: v.margenEfectivo,
        }
      : {}),
  };
}
