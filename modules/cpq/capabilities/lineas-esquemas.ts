import { z } from "zod";

import { AFP } from "@opai/domain";

import { uuidSchema } from "./esquemas";

export const horaSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const clp = z.number().int().min(0).max(100_000_000);

/**
 * Campos de la hoja de puesto (CPQ v4 §4.2) comunes a crear y actualizar. Montos en CLP enteros; el
 * plan Isapre en UF escalada (UF_ESCALA). `null` en un supuesto vuelve al defecto del tenant.
 */
export const camposPuesto = {
  cargoId: uuidSchema.nullable().optional().describe("Cargo del catálogo; trae el sueldo de referencia para cotizar."),
  patron: z.string().max(20).optional(),
  horaInicio: horaSchema.optional(),
  horaFin: horaSchema.optional(),
  diasSemana: z.array(z.number().int().min(1).max(7)).max(7).optional().describe("1 = lunes … 7 = domingo."),
  diasCobertura: z.number().int().min(1).max(7).optional(),
  sueldoBaseClp: clp.optional(),
  sueldoModo: z.enum(["bruto", "liquido"]).optional().describe("«liquido»: el bruto se calcula desde el líquido objetivo."),
  liquidoObjetivoClp: clp.nullable().optional(),
  colacionClp: clp.nullable().optional().describe("Colación mensual por persona (no imponible)."),
  movilizacionClp: clp.nullable().optional().describe("Movilización mensual por persona (no imponible)."),
  afp: z.enum(AFP).nullable().optional(),
  saludTipo: z.enum(["fonasa", "isapre"]).nullable().optional(),
  saludPlanUf: z.number().int().min(0).max(1_000_000).nullable().optional(),
  tipoContrato: z.enum(["indefinido", "plazo_fijo"]).nullable().optional(),
};

/** Campos que revelan o fijan montos: exigen `cpq:costos.ver` (R59). */
export const CAMPOS_COSTO_PUESTO = [
  "sueldoBaseClp", "liquidoObjetivoClp", "colacionClp", "movilizacionClp", "precioUnitarioClp", "margenPropioPct",
] as const;
