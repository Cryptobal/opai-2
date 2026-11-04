// Contrato `finanzas-apertura@1` (BRIEF-30 · CAR-168): entrada de la apertura desde 1.0.
import { z } from "zod";

import { uuidSchema } from "../core/esquemas";

const fechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato aaaa-mm-dd.");
const monto = z.number().int();

export const entradaAperturaSchema = z.object({
  saldos: z
    .array(z.object({ banco: z.string().max(80), numeroVisible: z.string().max(40), moneda: z.string().max(8).default("CLP"), saldo: monto }))
    .max(200),
  documentos: z
    .array(
      z.object({
        tipoDte: z.number().int(),
        folio: z.number().int(),
        rutReceptor: z.string().max(20),
        fechaEmision: fechaSchema,
        fechaVencimiento: fechaSchema.nullable().default(null),
        montoNeto: monto,
        montoExento: monto,
        montoIva: monto,
        montoTotal: monto,
        montoCobrado: monto,
        glosa: z.string().max(500).nullable().default(null),
      }),
    )
    .max(5000),
  folios: z.array(z.object({ tipoDte: z.number().int(), ultimoFolio: z.number().int() })).max(20),
});

export const inputAperturaImportar = z.object({
  fechaCorte: fechaSchema.describe("Fecha de los saldos de banco (aaaa-mm-dd)."),
  entrada: entradaAperturaSchema,
  aceptarRechazos: z.boolean().default(false).describe("Si hay filas rechazadas (RUT sin cuenta, banco inexistente, sin CAF), no se aplica nada salvo que se acepte explícitamente."),
});

export const inputAperturaRevertir = z.object({ importacionId: uuidSchema });

const sumas = z.object({ saldos: z.number(), documentos: z.number(), montoTotal: z.number(), porCobrar: z.number(), folios: z.number() });
export const resultadoApertura = z.object({
  importacionId: z.string().nullable(),
  creados: z.object({ saldos: z.number(), documentos: z.number(), folios: z.number() }),
  sinCambio: z.number(),
  rechazos: z.array(z.object({ entidad: z.string(), clave: z.string(), motivo: z.string() })),
  origen: sumas,
  destino: sumas,
  diferencias: z.array(z.string()),
});
export type ResultadoApertura = z.infer<typeof resultadoApertura>;
