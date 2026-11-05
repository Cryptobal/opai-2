// Cobranza de ventas (BRIEF-29 · CAR-166). Lógica pura: sin base de datos, sin reloj, sin Next.
// Reglas: docs/2.0/extraccion/finanzas-cobranza.md (R-COB-01 a R-COB-15).

import { type AmbitoHabil, diaUtc, sumarDias, sumarDiasHabiles } from "../calendario";

/** Documentos que se cobran: facturas afectas y exentas (igual que la conciliación bancaria). */
export const TIPOS_DTE_COBRABLES: ReadonlySet<number> = new Set([33, 34]);
/** Estados del DTE con deuda viva (el cliente ya lo recibió o el SII lo tiene). */
export const ESTADOS_DTE_COBRABLES: ReadonlySet<string> = new Set(["enviado", "aceptado"]);

export const PASOS_RECORDATORIO_DEFECTO: readonly number[] = [3, 7, 12];
export const PLAZO_COBRO_DEFECTO_DIAS = 30;

export type DocumentoCobranza = {
  tipoDte: number;
  estadoDte: string;
  cesionEstado: string | null;
  montoTotal: number;
  montoCobrado: number;
  /** Suma de las notas de crédito (61) emitidas contra la factura; ausente = 0. */
  montoNotasCredito?: number;
  /** aaaa-mm-dd; nulo si el documento no tiene vencimiento propio. */
  fechaVencimiento: string | null;
  /** aaaa-mm-dd; nula en borradores. */
  fechaEmision: string | null;
  cobranzaPausada?: boolean;
};

/** Tipo de DTE que reduce la deuda de una factura. La nota de débito (56) no suma deuda (regla de Carlos, 4-nov-2026). */
export const TIPO_DTE_NOTA_CREDITO = 61;
/** Estados en que una nota de crédito ya existe ante el SII y resta deuda (no borrador, rechazada ni anulada). */
export const ESTADOS_NC_QUE_RESTAN: readonly string[] = ["enviado", "aceptado"];

/** Saldo pendiente en CLP enteros: monto − notas de crédito − cobrado; nunca negativo. */
export function saldoPendiente(
  doc: Pick<DocumentoCobranza, "montoTotal" | "montoCobrado" | "montoNotasCredito">,
): number {
  return Math.max(0, doc.montoTotal - (doc.montoNotasCredito ?? 0) - doc.montoCobrado);
}

/** ¿Entra al universo de cobranza? Excluye NC, borradores, rechazados, anulados, cedidos y saldo cero. */
export function esCobrable(doc: DocumentoCobranza): boolean {
  return (
    TIPOS_DTE_COBRABLES.has(doc.tipoDte) &&
    ESTADOS_DTE_COBRABLES.has(doc.estadoDte) &&
    doc.cesionEstado !== "cedido" &&
    saldoPendiente(doc) > 0
  );
}

/** Vencimiento efectivo: el propio o emisión + plazo por defecto. Nulo si no hay de dónde calcularlo. */
export function vencimientoEfectivo(
  doc: Pick<DocumentoCobranza, "fechaVencimiento" | "fechaEmision">,
  plazoDefectoDias: number = PLAZO_COBRO_DEFECTO_DIAS,
): string | null {
  if (doc.fechaVencimiento) return doc.fechaVencimiento;
  if (doc.fechaEmision) return sumarDias(doc.fechaEmision, plazoDefectoDias);
  return null;
}

/**
 * Días de atraso a `hoy`. El día del vencimiento no está vencido (R-COB-02): atraso 0.
 * Negativo = faltan días. Compara días calendario, nunca horas.
 */
export function diasVencido(vencimiento: string, hoy: string): number {
  return Math.round((diaUtc(hoy).getTime() - diaUtc(vencimiento).getTime()) / 86_400_000);
}

export function estaVencida(doc: DocumentoCobranza, hoy: string, plazoDefectoDias?: number): boolean {
  if (!esCobrable(doc)) return false;
  const venc = vencimientoEfectivo(doc, plazoDefectoDias);
  return venc !== null && diasVencido(venc, hoy) > 0;
}

export type Tramo = "por_vencer" | "1_30" | "31_60" | "61_mas";
export const TRAMOS: readonly Tramo[] = ["por_vencer", "1_30", "31_60", "61_mas"];

/** Tramo de antigüedad según días de atraso (≤ 0 = por vencer). */
export function tramoDe(atrasoDias: number): Tramo {
  if (atrasoDias <= 0) return "por_vencer";
  if (atrasoDias <= 30) return "1_30";
  if (atrasoDias <= 60) return "31_60";
  return "61_mas";
}

export type FilaAging = Record<Tramo, number>;

export function agingVacio(): FilaAging {
  return { por_vencer: 0, "1_30": 0, "31_60": 0, "61_mas": 0 };
}

/** Suma saldos por tramo de los documentos cobrables con vencimiento calculable. */
export function aging(docs: readonly DocumentoCobranza[], hoy: string, plazoDefectoDias?: number): FilaAging {
  const fila = agingVacio();
  for (const doc of docs) {
    if (!esCobrable(doc)) continue;
    const venc = vencimientoEfectivo(doc, plazoDefectoDias);
    if (venc === null) continue;
    fila[tramoDe(diasVencido(venc, hoy))] += saldoPendiente(doc);
  }
  return fila;
}

export type DecisionRecordatorio =
  | { accion: "enviar"; paso: number }
  | { accion: "omitir"; motivo: "no_vencida" | "pausada" | "sin_pasos" | "tope" | "no_toca" };

export type EntradaRecordatorio = {
  doc: DocumentoCobranza;
  hoy: string;
  /** Pasos ya enviados con éxito (1 = primer recordatorio). */
  pasosEnviados: readonly number[];
  /** Días hábiles tras el vencimiento de cada paso. */
  pasos: readonly number[];
  ambito: AmbitoHabil;
  plazoDefectoDias?: number;
};

/**
 * Decide si hoy toca un recordatorio. Pura y determinista. Toca el primer paso aún no enviado cuya
 * fecha (vencimiento + N días hábiles con feriados) ya llegó. No recupera pasos atrasados en lote:
 * como mucho sale uno por ejecución (R-COB-11, tope = largo de la secuencia).
 */
export function evaluarRecordatorio(e: EntradaRecordatorio): DecisionRecordatorio {
  if (e.pasos.length === 0) return { accion: "omitir", motivo: "sin_pasos" };
  if (e.doc.cobranzaPausada) return { accion: "omitir", motivo: "pausada" };
  if (!estaVencida(e.doc, e.hoy, e.plazoDefectoDias)) return { accion: "omitir", motivo: "no_vencida" };
  const proximo = e.pasos.findIndex((_, i) => !e.pasosEnviados.includes(i + 1));
  if (proximo === -1) return { accion: "omitir", motivo: "tope" };
  const venc = vencimientoEfectivo(e.doc, e.plazoDefectoDias);
  if (venc === null) return { accion: "omitir", motivo: "no_vencida" };
  const toca = sumarDiasHabiles(venc, e.pasos[proximo] as number, e.ambito);
  return toca <= e.hoy ? { accion: "enviar", paso: proximo + 1 } : { accion: "omitir", motivo: "no_toca" };
}
