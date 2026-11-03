// Esquemas Zod de programación recurrente y CPQ en exports 1.0 (CAR-25).
import { z } from "zod";

const fecha = z.iso.datetime({ offset: true });
const texto = z.string().nullish();
const bandera = z.boolean().default(false);

/** Una línea de `FinanceDteRecurringTemplate.lines`: el precio es CLP (`unitPrice`) o UF (`unitPriceUf`). */
export const lineaRecurrenteOpai1 = z.object({
  itemName: texto,
  description: texto,
  quantity: z.number().min(0).default(1),
  unit: texto,
  unitPrice: z.number().min(0).nullish(),
  unitPriceUf: z.number().min(0).nullish(),
  discountPct: z.number().min(0).max(100).default(0),
  isExempt: bandera,
  /** Cuenta contable de 1.0 (sin equivalente directo en 2.0 todavía). */
  accountId: texto,
});

export const referenciaRecurrenteOpai1 = z.object({
  fchRef: z.string().min(1),
  folioRef: z.string().min(1),
  razonRef: z.string().optional(),
  tipoDocRef: z.string().min(1),
});

const entero = z.number().int();

/**
 * Plantilla de facturas recurrentes de 1.0. Los valores de catálogo (tipo, moneda, frecuencia,
 * política UF) se leen como texto o número: lo que 2.0 no soporta se omite con una advertencia
 * nombrada en el plan, sin hacer fallar todo el JSON.
 */
export const programacionRecurrenteOpai1 = z.object({
  id: z.string().min(1),
  crmAccountId: texto,
  installationId: texto,
  name: z.string().optional(),
  active: bandera,
  dteType: entero.default(33),
  currency: z.string().default("CLP"),
  lines: z.array(lineaRecurrenteOpai1).default([]),
  frequency: z.string().default("monthly"),
  /** 1–31 o -1 (último día del mes). */
  dayOfMonth: entero.default(1),
  dayOfWeek: entero.nullish(),
  monthOfYear: entero.nullish(),
  receiverRut: texto,
  receiverName: texto,
  receiverGiro: texto,
  receiverDireccion: texto,
  receiverComuna: texto,
  receiverCiudad: texto,
  receiverEmail: texto,
  receiverEmailCc: z.array(z.string()).default([]),
  recipientContactIds: z.array(z.string().min(1)).default([]),
  ufFixingPolicy: z.string().nullish(),
  ufFixingDay: entero.nullish(),
  facturaTiming: z.string().default("AL_EMITIR"),
  facturaDay: entero.nullish(),
  facturaMesRelativo: z.string().default("MES_SIGUIENTE"),
  diasCobroDesdeFactura: entero.min(0).max(365).default(30),
  billingPeriodMode: z.string().default("CURRENT_MONTH"),
  periodPolicy: z.string().default("CURRENT_MONTH"),
  variableAmount: bandera,
  autoSendProforma: bandera,
  autoSendPaymentStatement: bandera,
  autoSendEmail: bandera,
  hasIpcAdjustment: bandera,
  ipcAdjustmentMonths: entero.nullish(),
  ipcStartDate: texto,
  startDate: texto,
  endDate: texto,
  notes: texto,
  additionalReferences: z.array(referenciaRecurrenteOpai1).default([]),
  lastRunAt: fecha.nullish(),
  /** Última `FinanceDteRecurringRun` exitosa. `period`: AAAA-MM (o AAAA-MM-DD en semanal/quincenal). */
  lastSuccessfulRun: z.object({ runAt: fecha, period: texto }).nullish(),
  /** Se lee pero no se copia: las programaciones entran pausadas y sin próxima ejecución. */
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
