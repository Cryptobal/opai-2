import { z } from "zod";

import { conflicto } from "@opai/capabilities";

import { esLunes } from "../domain";

/** Traduce la violación de un índice único (carrera entre dos escrituras) a CONFLICT. */
export async function sinDuplicado<T>(p: Promise<T>, mensaje: string): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if ((e as { code?: unknown } | null)?.code === "P2002") throw conflicto(mensaje);
    throw e;
  }
}

export const uuidSchema = z.uuid();
/** Lunes de la semana en «YYYY-MM-DD»: toda semana del flujo se identifica por su lunes. */
export const semanaSchema = z
  .string()
  .refine(esLunes, "La semana se indica con su lunes (YYYY-MM-DD).");
/** Monto en CLP entero, sin negativos (el signo lo da la sección de la fila). */
export const montoSchema = z.number().int().min(0).max(2_000_000_000);
export const saldoSchema = z.number().int().min(-2_000_000_000).max(2_000_000_000);
export const seccionSchema = z.enum(["ingreso", "egreso"]);
export const capaSchema = z.enum(["plan", "comprometido", "real"]);

export const filaSchema = z.object({
  id: uuidSchema,
  seccion: seccionSchema,
  etiqueta: z.string(),
  vinculo: z.string().nullable(),
  arrastre: z.boolean(),
  orden: z.number().int(),
  activa: z.boolean(),
});

export const celdaSchema = z.object({
  id: uuidSchema,
  filaId: uuidSchema,
  semana: semanaSchema,
  capa: capaSchema,
  monto: z.number().int(),
  nota: z.string().nullable(),
});

export const ajustesSchema = z.object({
  saldoInicial: saldoSchema,
  umbral: saldoSchema,
  desde: semanaSchema,
  toleranciaCierre: montoSchema.default(1000),
  horizonteSemanas: z.number().int().min(1).max(52).default(12),
  calendarioPagos: z
    .object({
      remuneraciones: z.number().int().min(1).max(28).optional(),
      imposiciones: z.number().int().min(1).max(28).optional(),
      anticipos: z.number().int().min(1).max(28).optional(),
      iva: z.number().int().min(1).max(28).optional(),
    })
    .default({}),
  avisoActivo: z.boolean().default(false),
  avisoUmbral: saldoSchema.default(0),
  metaCeldaMs: z.number().int().min(1).max(10_000).default(100),
  metaGuardadoP95Ms: z.number().int().min(1).max(60_000).default(1000),
  metaCargaInicialS: z.number().int().min(1).max(120).default(2),
  metasVisibles: z.boolean().default(true),
});

type FilaDb = {
  id: string;
  seccion: string;
  etiqueta: string;
  vinculo: string | null;
  arrastre: boolean;
  orden: number;
  activa: boolean;
};
export const vistaFila = (f: FilaDb): z.infer<typeof filaSchema> => ({
  id: f.id,
  seccion: f.seccion as z.infer<typeof seccionSchema>,
  etiqueta: f.etiqueta,
  vinculo: f.vinculo,
  arrastre: f.arrastre,
  orden: f.orden,
  activa: f.activa,
});
