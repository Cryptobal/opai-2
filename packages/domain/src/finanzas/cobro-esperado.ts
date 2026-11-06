// Fecha esperada de cobro de una factura (ADR-073, decisión de Carlos del 4-nov-2026): la única fecha con la que
// el flujo de caja y «Hoy» ubican un ingreso futuro. Pura: sin base de datos.

import { lunesDe } from "./flujo-semana";

const DIA_MS = 86_400_000;
const aMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const aIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Facturas pagadas que un cliente necesita para que su promedio real de pago valga (ADR-073). */
export const MIN_FACTURAS_PARA_PROMEDIO = 3;

export const sumarDiasCobro = (iso: string, dias: number) => aIso(aMs(iso) + dias * DIA_MS);
export const diasEntreCobro = (desde: string, hasta: string) => Math.round((aMs(hasta) - aMs(desde)) / DIA_MS);

/**
 * Promedio real de días entre la emisión y el cobro. Con menos de 3 facturas pagadas no hay promedio (null) y
 * se usa el vencimiento. Las cobradas antes de emitirse (días negativos) cuentan como 0.
 */
export function promedioDiasDePago(dias: readonly number[]): number | null {
  if (dias.length < MIN_FACTURAS_PARA_PROMEDIO) return null;
  const suma = dias.reduce((t, d) => t + Math.max(0, d), 0);
  return Math.round(suma / dias.length);
}

export type OrigenCobroEsperado = "manual" | "promedio" | "vencimiento" | "emision";

/** Fecha esperada: la fijada a mano; si no, emisión + promedio del cliente; si no, el vencimiento (o la emisión). */
export function fechaEsperadaDeCobro(o: {
  manual?: string | null;
  fechaEmision: string | null;
  fechaVencimiento: string | null;
  promedioDias: number | null;
}): { fecha: string; origen: OrigenCobroEsperado } | null {
  if (o.manual) return { fecha: o.manual, origen: "manual" };
  if (o.promedioDias != null && o.fechaEmision) {
    return { fecha: sumarDiasCobro(o.fechaEmision, o.promedioDias), origen: "promedio" };
  }
  if (o.fechaVencimiento) return { fecha: o.fechaVencimiento, origen: "vencimiento" };
  if (o.fechaEmision) return { fecha: o.fechaEmision, origen: "emision" };
  return null;
}

/** Semana (lunes) donde cae un cobro: lo vencido o ya pasado se proyecta en la semana en curso. */
export function semanaDeCobroEsperado(fechaEsperada: string, lunesActual: string): string {
  const semana = lunesDe(fechaEsperada);
  return semana < lunesActual ? lunesActual : semana;
}

/** Pendiente de una factura: monto − notas de crédito parciales − cobrado, nunca bajo 0. */
export function pendienteDeFactura(o: { montoTotal: number; montoNotasCredito: number; montoCobrado: number }): number {
  return Math.max(0, o.montoTotal - o.montoNotasCredito - o.montoCobrado);
}
