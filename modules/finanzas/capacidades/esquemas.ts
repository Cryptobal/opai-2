import { z } from "zod";

import { conflicto, reglaDeNegocio } from "@opai/capabilities";

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
/** Tope por celda en CLP (paridad 1.0). */
export const MONTO_FLUJO_MAX = 999_999_999_999;
/** Monto en CLP entero, sin negativos (el signo lo da la sección de la fila). BIGINT en Postgres. */
export const montoSchema = z.number().int().min(0).max(MONTO_FLUJO_MAX);
/**
 * Saldo acumulado, neto y umbrales en la API (number JSON). Puede superar `montoSchema` porque la
 * planilla suma varias celdas. Tope = entero seguro en JS (coherente con serialización actual).
 */
export const saldoSchema = z
  .number()
  .int()
  .min(-Number.MAX_SAFE_INTEGER)
  .max(Number.MAX_SAFE_INTEGER);

/** Serializa BIGINT de Postgres a number JSON; falla cerrado fuera de MAX_SAFE_INTEGER. */
export function aNumeroSeguro(v: bigint | number): number {
  const n = typeof v === "bigint" ? Number(v) : v;
  if (!Number.isSafeInteger(n)) {
    throw reglaDeNegocio("El monto supera el rango seguro para la API (entero JS).");
  }
  return n;
}

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
  /** Un solo umbral de saldo bajo (planilla, aviso semanal y aviso de banco); su valor por defecto vive en `ajustesDe`. */
  umbral: saldoSchema,
  desde: semanaSchema,
  horizonteSemanas: z.number().int().min(1).max(52),
  calendarioPagos: z
    .object({
      remuneraciones: z.number().int().min(1).max(28).optional(),
      imposiciones: z.number().int().min(1).max(28).optional(),
      anticipos: z.number().int().min(1).max(28).optional(),
      iva: z.number().int().min(1).max(28).optional(),
    }),
  avisoActivo: z.boolean(),
  metaCeldaMs: z.number().int().min(1).max(10_000),
  metaGuardadoP95Ms: z.number().int().min(1).max(60_000),
  metaCargaInicialS: z.number().int().min(1).max(120),
  metasVisibles: z.boolean(),
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
