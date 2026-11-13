import { z } from "zod";

import { aNumeroSeguro, montoSchema, uuidSchema } from "./esquemas";
import { aIso } from "./util";

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Usa el formato aaaa-mm-dd.");

/** Datos editables de un gasto recurrente (CAR-349). */
export const recurrenteDatos = {
  concepto: z.string().trim().min(2).max(120),
  unidad: z
    .enum(["clp", "uf", "pct_ventas"])
    .default("clp")
    .describe("clp = pesos; uf = UF del día de cada cuota; pct_ventas = % de las ventas netas del mes anterior (retiro de socios)."),
  monto: montoSchema
    .refine((v) => v > 0, "El monto debe ser mayor que cero.")
    .describe("Entero por cuota según la unidad: CLP; UF × 10.000 (12,5 UF = 125000); % × 10.000 (5 % = 50000, tope 1000000)."),
  politicaUf: z
    .enum(["dia_cuota", "fin_de_mes", "fin_mes_anterior", "inicio_de_mes", "dia_fijo"])
    .default("dia_cuota")
    .describe("Solo UF: qué día de UF usa cada cuota (el de la cuota, fin de mes, fin del mes anterior, inicio de mes o un día fijo)."),
  ufDiaFijo: z.number().int().min(1).max(31).nullable().default(null).describe("Solo con politicaUf «dia_fijo»: 1 a 31."),
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
  unidad: string;
  politicaUf: string;
  ufDiaFijo: number | null;
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
    unidad: r.unidad as "clp" | "uf" | "pct_ventas",
    politicaUf: r.politicaUf as z.infer<typeof recurrenteDatos.politicaUf>,
    ufDiaFijo: r.ufDiaFijo,
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

/** Tope del porcentaje: 1.000.000 = 100 % de las ventas netas. */
export const PCT_TOPE = 1_000_000;

/** Reglas que el modelo no puede expresar en tipos: día solo en mensual, fin posterior al inicio y % ≤ 100. */
type Revisable = { frecuencia: string; diaDelMes: number | null; inicio: string; fin: string | null; unidad: string; monto: number; politicaUf: string; ufDiaFijo: number | null };
export function motivoInvalido(d: Revisable): string | null {
  if (d.unidad === "pct_ventas" && d.monto > PCT_TOPE) return "El porcentaje de ventas no puede superar el 100 %.";
  if (d.unidad !== "uf" && d.politicaUf !== "dia_cuota") return "El día de la UF solo aplica a montos en UF.";
  if ((d.politicaUf === "dia_fijo") !== (d.ufDiaFijo != null)) return "El día fijo de la UF se indica solo con la política «día fijo», y es obligatorio con ella.";
  if (d.frecuencia !== "mensual" && d.diaDelMes != null) return "El día del mes solo aplica a la frecuencia mensual.";
  if (d.fin && d.fin < d.inicio) return "La fecha de fin no puede ser anterior al inicio.";
  return null;
}
