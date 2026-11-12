// Esquemas Zod de la cotización CPQ de 1.0 en el export (CAR-326).
import { z } from "zod";

const fecha = z.iso.datetime({ offset: true });
const texto = z.string().nullish();

/** Decimal de 1.0 exportado como texto (o número). Vacío o ilegible queda nulo, sin romper la fila. */
const decimalOpcional = z
  .union([z.number(), z.string()])
  .nullish()
  .transform((v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(v.trim());
    return Number.isFinite(n) ? n : null;
  });

/** Puesto cotizado de 1.0 (`CpqPosition`): horario, días, dotación y sueldo base. */
export const puestoCotizacionOpai1 = z.object({
  id: z.string().min(1),
  customName: texto,
  description: texto,
  weekdays: z.array(z.union([z.string(), z.number()])).default([]),
  startTime: texto,
  endTime: texto,
  numGuards: decimalOpcional,
  numPuestos: decimalOpcional,
  baseSalary: decimalOpcional,
  afpName: texto,
  healthSystem: texto,
  displayOrder: decimalOpcional,
  puestoTrabajo: z.object({ name: texto }).nullish(),
  cargo: z.object({ name: texto }).nullish(),
});

/** Parámetros de venta de 1.0 (`CpqQuoteParameters`): lo que 2.0 conserva de la cotización. */
export const parametrosCotizacionOpai1 = z.object({
  salePriceMonthly: decimalOpcional,
  contractMonths: decimalOpcional,
  marginPct: decimalOpcional,
  marginMode: texto,
});

/** Cotización CPQ de 1.0 (correlativo R54; el export incluye borradores sin `validUntil`). */
export const cotizacionOpai1 = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: texto,
  clientName: texto,
  validUntil: z.string().nullish(),
  status: texto,
  currency: texto,
  dealId: texto,
  accountId: texto,
  installationId: texto,
  sentAt: fecha.nullish(),
  createdAt: fecha,
  positions: z.array(puestoCotizacionOpai1).default([]),
  parameters: parametrosCotizacionOpai1.nullish(),
  /** Costos, uniformes, comidas, vehículos y adicionales: se cuentan para avisar, no se copian. */
  uniformItems: z.array(z.unknown()).default([]),
  examItems: z.array(z.unknown()).default([]),
  costItems: z.array(z.unknown()).default([]),
  meals: z.array(z.unknown()).default([]),
  vehicles: z.array(z.unknown()).default([]),
  infrastructure: z.array(z.unknown()).default([]),
  additionalLines: z.array(z.unknown()).default([]),
});

export type CotizacionOpai1 = z.infer<typeof cotizacionOpai1>;
export type PuestoCotizacionOpai1 = z.infer<typeof puestoCotizacionOpai1>;
