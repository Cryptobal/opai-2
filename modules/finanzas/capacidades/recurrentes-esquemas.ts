import { z } from "zod";

import { aNumeroSeguro, montoSchema, uuidSchema } from "./esquemas";
import { aIso } from "./util";

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Usa el formato aaaa-mm-dd.");

/** Datos editables de un gasto recurrente (CAR-349). */
export const recurrenteDatos = {
  concepto: z.string().trim().min(2).max(120),
  monto: montoSchema.refine((v) => v > 0, "El monto debe ser mayor que cero.").describe("CLP entero por cuota."),
  frecuencia: z.enum(["semanal", "quincenal", "mensual"]),
  diaDelMes: z
    .number()
    .int()
    .refine((d) => d === -1 || (d >= 1 && d <= 31), "Día del mes de 1 a 31, o −1 para el último día.")
    .nullable()
    .default(null)
    .describe("Solo mensual. 1 a 31 (se ajusta en meses cortos) o −1 = último día del mes."),
  inicio: fecha,
  fin: fecha.nullable().default(null),
  repeticiones: z.number().int().min(1).max(600).nullable().default(null).describe("Tope de cuotas desde el inicio."),
  ventanaAntes: z.number().int().min(0).max(31).default(5),
  ventanaDespues: z.number().int().min(0).max(31).default(10),
  nota: z.string().trim().max(500).nullable().default(null),
};

export const recurrenteSchema = z.object({
  id: uuidSchema,
  filaId: uuidSchema,
  ...recurrenteDatos,
  activa: z.boolean(),
  claveOrigen: z.string().nullable(),
});

type FilaDb = {
  id: string;
  filaId: string;
  concepto: string;
  monto: bigint | number;
  frecuencia: string;
  diaDelMes: number | null;
  inicio: Date;
  fin: Date | null;
  repeticiones: number | null;
  ventanaAntes: number;
  ventanaDespues: number;
  activa: boolean;
  nota: string | null;
  claveOrigen: string | null;
};

export function vistaRecurrente(r: FilaDb): z.infer<typeof recurrenteSchema> {
  return {
    id: r.id,
    filaId: r.filaId,
    concepto: r.concepto,
    monto: aNumeroSeguro(r.monto),
    frecuencia: r.frecuencia as "semanal" | "quincenal" | "mensual",
    diaDelMes: r.diaDelMes,
    inicio: aIso(r.inicio),
    fin: r.fin ? aIso(r.fin) : null,
    repeticiones: r.repeticiones,
    ventanaAntes: r.ventanaAntes,
    ventanaDespues: r.ventanaDespues,
    nota: r.nota,
    activa: r.activa,
    claveOrigen: r.claveOrigen,
  };
}

/** Reglas que el modelo no puede expresar en tipos: día solo en mensual y fin posterior al inicio. */
export function motivoInvalido(d: { frecuencia: string; diaDelMes: number | null; inicio: string; fin: string | null }): string | null {
  if (d.frecuencia !== "mensual" && d.diaDelMes != null) return "El día del mes solo aplica a la frecuencia mensual.";
  if (d.fin && d.fin < d.inicio) return "La fecha de fin no puede ser anterior al inicio.";
  return null;
}
