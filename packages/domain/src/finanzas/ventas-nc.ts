// Nota de crédito y cesión (CAR-137 corrección 1 · P1 / P3).

import type { CodigoReferenciaNc, EstadoDteEmitido } from "./ventas";
import { CODIGOS_REFERENCIA_NC } from "./ventas";

export type { CodigoReferenciaNc };

/** Estados de cesión alineados a OPAI 1.0 / Cobranzas (R-FIN-040). */
export const ESTADOS_CESION = ["emitido", "cedido", "no_cedido"] as const;
export type EstadoCesion = (typeof ESTADOS_CESION)[number];

export const CESION_DEFECTO_EMITIDO = "no_cedido" satisfies EstadoCesion;

/** Suma montos de NC monetarias (CodRef 1 y 3) ya emitidas contra el mismo documento. */
export function montoNcAcumuladoMonetario(
  notas: readonly { montoTotal: number; codigoReferencia: number | null }[],
): number {
  return notas
    .filter((n) => n.codigoReferencia === 1 || n.codigoReferencia === 3)
    .reduce((a, n) => a + n.montoTotal, 0);
}

/** true si ya hubo una NC CodRef 1 (anulación) sobre el original. */
export function existeAnulacionCod1(
  notas: readonly { codigoReferencia: number | null }[],
): boolean {
  return notas.some((n) => n.codigoReferencia === 1);
}

/** CodRef 1 con monto que agota lo pendiente → el original pasa a anulado_nc. */
export function debeAnularDocumentoOriginal(
  codigoReferencia: CodigoReferenciaNc,
  monto: number,
  restanteMonetario: number,
): boolean {
  return codigoReferencia === 1 && monto >= restanteMonetario;
}

/** Valida reglas de negocio de emisión NC (P1 / R-FIN-036). */
export function validarEmisionNotaCredito(p: {
  refEstadoDte: EstadoDteEmitido;
  refMontoTotal: number;
  codigoReferencia: CodigoReferenciaNc;
  monto: number;
  acumuladoMonetario: number;
  yaAnuloCod1: boolean;
}): string | null {
  if (p.refEstadoDte === "anulado_nc") {
    return "El documento ya está anulado por nota de crédito.";
  }
  const restante = p.refMontoTotal - p.acumuladoMonetario;
  if (p.codigoReferencia === 1) {
    if (p.yaAnuloCod1) return "Ya existe una nota de crédito de anulación (CodRef 1) sobre este documento.";
    if (p.monto > restante) {
      return restante <= 0
        ? "No queda monto disponible para anular este documento."
        : `La anulación (CodRef 1) no puede superar lo pendiente (${restante}).`;
    }
    return null;
  }
  if (p.codigoReferencia === 3) {
    if (p.monto > restante) {
      return restante <= 0
        ? "No queda monto disponible para corregir montos."
        : `La corrección de montos (CodRef 3) no puede superar lo pendiente (${restante}).`;
    }
    return null;
  }
  if (p.monto > p.refMontoTotal) return "El monto no puede superar el total del documento.";
  return null;
}

/** Monto efectivo de la NC según CodRef (2 = mínimo simbólico si el input es 0). */
export function montoEfectivoNotaCredito(codigoReferencia: CodigoReferenciaNc, monto: number): number {
  if (codigoReferencia === 2 && monto < 1) return 1;
  return monto;
}

export { CODIGOS_REFERENCIA_NC };
