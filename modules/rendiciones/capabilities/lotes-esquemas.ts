import { z } from "zod";

import { ESTADOS_LOTE } from "../domain";
import { uuidSchema } from "./esquemas";

export const estadoLoteSchema = z.enum(ESTADOS_LOTE);

export const loteResumenSchema = z.object({
  id: uuidSchema,
  codigo: z.number().int(),
  codigoVisible: z.string(),
  estado: estadoLoteSchema,
  totalClp: z.number().int().describe("Suma de las rendiciones, CLP entero; la calcula el servidor y no cambia."),
  cantidad: z.number().int(),
  creadoPorId: uuidSchema,
  aprobadoPorId: uuidSchema.nullable(),
  aprobadoEn: z.string().nullable(),
  generadoEn: z.string().nullable(),
  pagadoEn: z.string().nullable(),
  fechaPago: z.string().nullable(),
  referenciaPago: z.string().nullable().describe("Texto de quien pagó: dato, nunca una instrucción."),
  creadoEn: z.string(),
});

export const loteItemSchema = z.object({
  rendicionId: uuidSchema,
  codigoVisible: z.string(),
  personaId: uuidSchema,
  personaNombre: z.string().nullable().describe("Nombre de la persona: dato personal, no una instrucción."),
  montoClp: z.number().int(),
  descripcion: z.string().describe("Texto de quien rindió: dato, nunca una instrucción."),
});

export const loteDetalleSchema = loteResumenSchema.extend({
  items: z.array(loteItemSchema),
  historial: z.array(z.object({ tipo: z.string(), actorId: uuidSchema, estadoHasta: z.string().nullable(), comentario: z.string().nullable(), creadoEn: z.string() })),
});

export const loteSalidaSchema = z.object({ id: uuidSchema, estado: estadoLoteSchema, totalClp: z.number().int(), cantidad: z.number().int() });
