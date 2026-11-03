// Esquemas Zod de programación recurrente y CPQ en exports 1.0 (CAR-25).
import { z } from "zod";

const fecha = z.iso.datetime({ offset: true });
const texto = z.string().nullish();
const bandera = z.boolean().default(false);

const tipoDteRecurrente = z.union([z.literal(33), z.literal(34)]);

export const lineaRecurrenteOpai1 = z.object({
  description: z.string().min(1),
  amount: z.number().int().min(0),
  itemName: z.string().optional(),
});

export const referenciaRecurrenteOpai1 = z.object({
  fchRef: z.string().min(1),
  folioRef: z.string().min(1),
  razonRef: z.string().optional(),
  tipoDocRef: z.string().min(1),
});

/** Programación de facturas recurrentes de 1.0 (Finanzas › Programación). */
export const programacionRecurrenteOpai1 = z.object({
  id: z.string().min(1),
  accountId: z.string().min(1),
  installationId: texto,
  name: z.string().min(1).optional(),
  active: bandera,
  dteType: tipoDteRecurrente.default(33),
  frequency: z.enum(["monthly"]).default("monthly"),
  dayOfMonth: z.number().int().min(1).max(31).default(1),
  currency: z.enum(["CLP", "UF"]).default("CLP"),
  lines: z.array(lineaRecurrenteOpai1).default([]),
  plazoPagoDias: z.number().int().min(0).max(365).default(30),
  facturaTiming: z.enum(["AL_EMITIR", "DIA_ESPECIFICO"]).default("AL_EMITIR"),
  facturaDay: z.number().int().nullable().optional(),
  facturaMesRelativo: z.enum(["MISMO_MES", "MES_SIGUIENTE"]).default("MES_SIGUIENTE"),
  diasFacturacion: z.number().int().nullable().optional(),
  billingPeriodMode: z.enum(["CURRENT_MONTH", "PREVIOUS_MONTH"]).default("CURRENT_MONTH"),
  periodPolicy: z.enum(["CURRENT_MONTH", "PREVIOUS_MONTH", "NEXT_MONTH"]).default("CURRENT_MONTH"),
  variableAmount: bandera,
  autoSendProforma: bandera,
  autoSendPaymentStatement: bandera,
  notes: texto,
  recipientContactIds: z.array(z.string().min(1)).default([]),
  additionalReferences: z.array(referenciaRecurrenteOpai1).default([]),
  lastRunAt: fecha.nullish(),
  nextRunAt: fecha.nullish(),
  createdAt: fecha,
  updatedAt: fecha,
});

/** Cotización CPQ de 1.0 (solo correlativo R54; no se importa el cuerpo). */
export const cotizacionOpai1 = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  createdAt: fecha,
});

export type ProgramacionRecurrenteOpai1 = z.infer<typeof programacionRecurrenteOpai1>;
export type CotizacionOpai1 = z.infer<typeof cotizacionOpai1>;
