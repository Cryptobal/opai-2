import { z } from "zod";

import type { Estructura } from "@opai/domain";

import { dia } from "./comun";

export const NIVELES = ["cargo", "puesto", "persona"] as const;

export const itemInput = z.object({
  tipo: z.enum(["bono_fijo", "bono_porcentual"]),
  nombre: z.string().trim().min(2).max(80),
  monto: z.number().int().min(0).nullable().optional().describe("CLP entero (bono fijo)."),
  porcentaje: z
    .number()
    .int()
    .min(0)
    .max(1_000_000)
    .nullable()
    .optional()
    .describe("En escala 1.000.000 = 100 % (19 % = 190.000)."),
  imponible: z.boolean().default(true),
  tributable: z.boolean().default(true),
});

export const estructuraSchema = z.object({
  id: z.string(),
  nivel: z.enum(NIVELES),
  cargoId: z.string().nullable(),
  puestoId: z.string().nullable(),
  personaId: z.string().nullable(),
  sensible: z
    .boolean()
    .describe("true: montos ocultos por falta del permiso de sueldos sensibles."),
  sueldoBase: z.number().nullable(),
  colacion: z.number().nullable(),
  movilizacion: z.number().nullable(),
  gratificacion: z.string(),
  gratificacionMonto: z.number().nullable(),
  vigenteDesde: z.string(),
  vigenteHasta: z.string().nullable(),
  motivo: z.string().nullable(),
  estado: z.string(),
  items: z.array(
    itemInput.extend({ monto: z.number().nullable(), porcentaje: z.number().nullable() }),
  ),
});

export type FilaEstructura = {
  id: string;
  nivel: string;
  cargoId?: string | null;
  puestoId?: string | null;
  personaId?: string | null;
  sueldoBase: number;
  colacion?: number | null;
  movilizacion?: number | null;
  gratificacion?: string | null;
  gratificacionMonto?: number | null;
  vigenteDesde: Date;
  vigenteHasta?: Date | null;
  motivo?: string | null;
  estado?: string | null;
};
export type FilaItem = {
  tipo: string;
  nombre: string;
  monto?: number | null | undefined;
  porcentaje?: number | null | undefined;
  imponible?: boolean | undefined;
  tributable?: boolean | undefined;
};

export function vistaEstructura(e: FilaEstructura, items: FilaItem[], ocultar: boolean) {
  const m = (v: number | null | undefined) => (ocultar ? null : (v ?? 0));
  return {
    id: e.id,
    nivel: e.nivel as (typeof NIVELES)[number],
    cargoId: e.cargoId ?? null,
    puestoId: e.puestoId ?? null,
    personaId: e.personaId ?? null,
    sensible: ocultar,
    sueldoBase: m(e.sueldoBase),
    colacion: m(e.colacion),
    movilizacion: m(e.movilizacion),
    gratificacion: e.gratificacion ?? "legal_25",
    gratificacionMonto: ocultar ? null : (e.gratificacionMonto ?? null),
    vigenteDesde: dia(e.vigenteDesde) ?? "",
    vigenteHasta: dia(e.vigenteHasta),
    motivo: e.motivo ?? null,
    estado: e.estado ?? "vigente",
    items: items.map((i) => ({
      tipo: i.tipo as "bono_fijo" | "bono_porcentual",
      nombre: i.nombre,
      monto: ocultar ? null : (i.monto ?? null),
      porcentaje: ocultar ? null : (i.porcentaje ?? null),
      imponible: i.imponible ?? true,
      tributable: i.tributable ?? true,
    })),
  };
}

/** Para el dominio (resolución y haberes). */
export function aDominio(e: FilaEstructura, items: FilaItem[]): Estructura {
  return {
    id: e.id,
    nivel: e.nivel as Estructura["nivel"],
    sueldoBase: e.sueldoBase,
    colacion: e.colacion ?? 0,
    movilizacion: e.movilizacion ?? 0,
    gratificacion: (e.gratificacion ?? "legal_25") as Estructura["gratificacion"],
    gratificacionMonto: e.gratificacionMonto ?? null,
    vigenteDesde: dia(e.vigenteDesde) ?? "",
    vigenteHasta: dia(e.vigenteHasta),
    estado: (e.estado ?? "vigente") as Estructura["estado"],
    items: items.map((i) => ({
      tipo: i.tipo as "bono_fijo" | "bono_porcentual",
      nombre: i.nombre,
      monto: i.monto ?? null,
      porcentaje: i.porcentaje ?? null,
      imponible: i.imponible ?? true,
    })),
  };
}
