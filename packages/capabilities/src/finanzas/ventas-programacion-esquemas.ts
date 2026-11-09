// Esquemas de entrada de las programaciones recurrentes (BRIEF-26 · CAR-159).
import { z } from "zod";

import {
  DIAS_FACTURACION_MAX,
  FRECUENCIAS_PROGRAMACION,
  MESES_RELATIVOS_FACTURA,
  MOMENTOS_FACTURA,
  POLITICAS_UF,
} from "@opai/domain";

import { uuidSchema } from "../core/esquemas";
import { textoOpcional } from "../core/maestros/comun";

const fechaIso = z.iso.date();

export const lineaProgramacionSchema = z.object({
  glosa: z.string().trim().min(1).max(300),
  cantidad: z
    .string()
    .trim()
    .regex(/^\d{1,10}([.,]\d{1,4})?$/, "Cantidad con hasta 4 decimales.")
    .default("1")
    .describe("Cantidad decimal como texto («1», «0,5»)."),
  unidad: textoOpcional(20),
  precioUnitario: z
    .number()
    .int()
    .min(0)
    .max(2_000_000_000)
    .describe(
      "Precio unitario: pesos enteros si la moneda es CLP; UF × 10.000 si es UF (1 UF = 10000).",
    ),
  descuentoPct: z
    .number()
    .int()
    .min(0)
    .max(10_000)
    .default(0)
    .describe("Descuento en centésimas de punto (1550 = 15,50 %)."),
  exento: z.boolean().default(false),
});

export const programacionBaseSchema = z.object({
  nombre: z.string().trim().min(1).max(120),
  cuentaId: uuidSchema,
  instalacionId: uuidSchema.nullable().optional(),
  tipoDte: z
    .union([z.literal(33), z.literal(34)])
    .describe("33 factura afecta, 34 factura exenta."),
  frecuencia: z.enum(FRECUENCIAS_PROGRAMACION).default("mensual"),
  diaGeneracion: z
    .number()
    .int()
    .refine((d) => d === -1 || (d >= 1 && d <= 31), "Día 1–31 o -1 (último día).")
    .describe("Día del mes en que se genera el borrador; -1 = último día."),
  diaSemana: z
    .number()
    .int()
    .min(0)
    .max(6)
    .nullable()
    .optional()
    .describe("0 domingo … 6 sábado (semanal y quincenal)."),
  mesDelAnio: z
    .number()
    .int()
    .min(1)
    .max(12)
    .nullable()
    .optional()
    .describe("Mes de generación (anual)."),
  moneda: z.enum(["CLP", "UF"]).default("CLP"),
  politicaUf: z
    .enum(POLITICAS_UF)
    .nullable()
    .optional()
    .describe("Qué UF se usa en las líneas en UF."),
  diaUf: z.number().int().min(1).max(31).nullable().optional(),
  plazoPagoDias: z.number().int().min(0).max(365).default(30),
  diasFacturacion: z
    .number()
    .int()
    .min(0)
    .max(DIAS_FACTURACION_MAX)
    .nullable()
    .optional()
    .describe("Días entre el borrador y la factura (0–120). Si se indica, prevalece sobre el momento configurado."),
  momentoFactura: z
    .enum(MOMENTOS_FACTURA)
    .default("AL_EMITIR")
    .describe("AL_EMITIR: la factura se proyecta el día de generación. DIA_FIJO: el día `diaFactura` del mes relativo."),
  diaFactura: z.number().int().min(-1).max(31).nullable().optional().describe("Día de la factura con DIA_FIJO; -1 = último día."),
  mesRelativoFactura: z.enum(MESES_RELATIVOS_FACTURA).default("MES_SIGUIENTE"),
  autoEnvioProforma: z
    .boolean()
    .default(false)
    .describe(
      "Modalidad: la programación manda al cliente una proforma antes de facturar. Es solo la marca; la proforma no es un DTE ni una deuda fiscal.",
    ),
  autoEnvioEstadoPago: z
    .boolean()
    .default(false)
    .describe(
      "Modalidad: la programación manda al cliente un estado de pago antes de facturar. Es solo la marca; no es un DTE ni una deuda fiscal.",
    ),
  fechaInicio: fechaIso.nullable().optional(),
  fechaFin: fechaIso.nullable().optional(),
  notas: textoOpcional(1000),
  lineas: z.array(lineaProgramacionSchema).min(1).max(60),
  destinatarioIds: z
    .array(uuidSchema)
    .max(20)
    .default([])
    .describe("Contactos que reciben la factura."),
});

export type ProgramacionInput = z.infer<typeof programacionBaseSchema>;
export type LineaProgramacionInput = z.infer<typeof lineaProgramacionSchema>;
