import { z } from "zod";

import { ESTADOS_COTIZACION } from "../domain";

/** Esquemas compartidos por las capacidades de CPQ (ADR-004). */
export const uuidSchema = z.uuid();
export const estadoSchema = z.enum(ESTADOS_COTIZACION);
export const monedaSchema = z.enum(["CLP", "UF"]);

export const listaSchema = z.object({
  cursor: uuidSchema.optional().describe("Id de la última fila de la página anterior."),
  limite: z.number().int().min(1).max(100).default(50),
});

/**
 * Resumen de una versión. `margen` solo viaja con `cpq:costos.ver` (R59): sin el permiso la clave
 * no existe en la respuesta, no va vacía. La venta mensual es nula hasta que exista el motor.
 */
export const versionSchema = z.object({
  id: uuidSchema,
  numero: z.number().int(),
  estado: estadoSchema,
  moneda: monedaSchema,
  validaHasta: z.string().nullable(),
  ventaMensualClp: z.number().int().nullable(),
  enviadaEn: z.date().nullable(),
  margen: z.object({ modo: z.string(), objetivoPct: z.number().int().nullable() }).optional(),
});

export const cotizacionSchema = z.object({
  id: uuidSchema,
  codigo: z.string(),
  negocioId: uuidSchema,
  titulo: z.string(),
  alternativaDeId: uuidSchema.nullable(),
  vigente: z.boolean(),
  creadoPorId: uuidSchema,
  createdAt: z.date(),
});

export const lineaSchema = z.object({
  id: uuidSchema,
  tipo: z.enum(["puesto", "item", "adicional"]),
  grupo: z.string().nullable(),
  nombre: z.string(),
  posiciones: z.number().int(),
  recurrencia: z.enum(["mensual", "unico"]),
  habilitada: z.boolean(),
  visibleCliente: z.boolean(),
});

export const seccionSchema = z.object({
  id: uuidSchema,
  instalacionId: uuidSchema.nullable(),
  nombre: z.string(),
  lineas: z.array(lineaSchema),
});
