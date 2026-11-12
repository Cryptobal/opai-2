import { ESTADOS_NC_QUE_RESTAN, saldoPendiente, TIPO_DTE_NOTA_CREDITO } from "@opai/domain";
import type { TenantTx } from "@opai/db";

import { reglaDeNegocio } from "../errores";
import { ORIGEN_HISTORICO } from "./cobros-origen";

/** Estados de cobro del libro de ventas (única función que escribe `estado_cobro`). */
export type EstadoCobro = "pendiente" | "pagada_parcial" | "pagada";

const TIPOS_FACTURA_COBRABLE = new Set([33, 34]);

export function calcularEstadoCobro(montoTotal: number, montoCobrado: number): EstadoCobro {
  if (montoCobrado <= 0) return "pendiente";
  if (montoCobrado + 1 >= montoTotal) return "pagada";
  return "pagada_parcial";
}

type LectorNc = {
  documentoEmitido: {
    groupBy(args: {
      by: ["documentoReferenciaId"];
      where: { documentoReferenciaId: { in: string[] }; tipoDte: number; estadoDte: { in: string[] }; codigoReferencia: { in: number[] } };
      _sum: { montoTotal: true };
    }): Promise<{ documentoReferenciaId: string | null; _sum: { montoTotal: number | null } }[]>;
  };
};

/**
 * Suma de las notas de crédito (61) emitidas contra cada factura. Solo restan las monetarias (CodRef 1 anula, 3 corrige montos),
 * igual que `montoNcAcumuladoMonetario`; la CodRef 2 (corrige texto) y las legadas sin código no restan. La nota de débito (56)
 * no cuenta (regla de Carlos, 4-nov-2026).
 */
export async function notasCreditoPorDocumento(db: LectorNc, ids: string[]): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map();
  const filas = await db.documentoEmitido.groupBy({
    by: ["documentoReferenciaId"],
    where: { documentoReferenciaId: { in: ids }, tipoDte: TIPO_DTE_NOTA_CREDITO, estadoDte: { in: [...ESTADOS_NC_QUE_RESTAN] }, codigoReferencia: { in: [1, 3] } },
    _sum: { montoTotal: true },
  });
  return new Map(filas.flatMap((f) => (f.documentoReferenciaId ? [[f.documentoReferenciaId, f._sum.montoTotal ?? 0] as const] : [])));
}

type LectorPendiente = Pick<TenantTx, "documentoEmitido" | "conciliacionBanco" | "importacionFila">;

/**
 * Lo ya cobrado en 1.0 (apertura, BRIEF-30) o en el sistema de origen de un documento importado (CAR-283): no
 * tiene conciliación, se suma como base.
 */
async function cobradoAperturaDe(tx: Pick<TenantTx, "importacionFila">, documentoId: string): Promise<number> {
  const apertura = await tx.importacionFila.findFirst({
    where: { id20: documentoId, accion: "creado", OR: ORIGEN_HISTORICO },
    select: { previos: true },
  });
  return Number((apertura?.previos as { cobradoApertura?: number } | null)?.cobradoApertura ?? 0);
}

/**
 * Saldo pendiente actual de una factura emitida: monto − notas de crédito parciales − cobrado (apertura + conciliaciones
 * confirmadas). Lee el documento fresco: llamar tras tomar el candado del documento.
 */
export async function pendienteFacturaEmitida(
  tx: LectorPendiente,
  documentoId: string,
): Promise<{ pendiente: number; exigible: number; montoNotasCredito: number } | null> {
  const doc = await tx.documentoEmitido.findFirst({ where: { id: documentoId }, select: { montoTotal: true } });
  if (!doc) return null;
  const [nc, conc, base] = await Promise.all([
    notasCreditoPorDocumento(tx, [documentoId]),
    tx.conciliacionBanco.aggregate({
      where: { enlaceId: documentoId, tipoEnlace: "documento_emitido", activa: true, confirmada: true },
      _sum: { monto: true },
    }),
    cobradoAperturaDe(tx, documentoId),
  ]);
  const montoNotasCredito = nc.get(documentoId) ?? 0;
  const cobrado = base + Number(conc._sum.monto ?? 0n);
  return {
    pendiente: saldoPendiente({ montoTotal: doc.montoTotal, montoCobrado: cobrado, montoNotasCredito }),
    exigible: Math.max(0, doc.montoTotal - montoNotasCredito),
    montoNotasCredito,
  };
}

type DocCobro = {
  id: string;
  tipoDte: number;
  montoTotal: number;
  estadoDte: string;
  cesionEstado: string | null;
};

/** Valida que un DTE emitido admita cobro desde banca (C5). */
export function validarDocumentoCobroBanco(doc: DocCobro, signoMovimiento: number): void {
  if (doc.estadoDte === "borrador") throw reglaDeNegocio("El documento aún es borrador.");
  if (doc.estadoDte === "rechazado") throw reglaDeNegocio("No se puede cobrar un documento rechazado por el SII.");
  if (doc.estadoDte === "anulado_nc") throw reglaDeNegocio("No se puede cobrar un documento anulado por nota de crédito.");
  if (doc.cesionEstado === "cedido") throw reglaDeNegocio("No se puede cobrar un documento cedido en factoring.");
  if (!TIPOS_FACTURA_COBRABLE.has(doc.tipoDte)) {
    throw reglaDeNegocio("Solo se concilian cobros contra facturas emitidas (33 o 34), no notas ni otros DTE.");
  }
  if (signoMovimiento <= 0) {
    throw reglaDeNegocio("Un cobro de ventas exige un movimiento bancario positivo (abono).");
  }
}

type DocCompra = { tipoDte: number };

/** Valida enlace de un pago a compras (egreso bancario). */
export function validarDocumentoCompraBanco(doc: DocCompra, signoMovimiento: number): void {
  if (!TIPOS_FACTURA_COBRABLE.has(doc.tipoDte)) {
    throw reglaDeNegocio("Solo se concilian pagos contra facturas de compra (33 o 34), no notas ni otros DTE.");
  }
  if (signoMovimiento >= 0) {
    throw reglaDeNegocio("Un pago de compras exige un movimiento bancario negativo (cargo).");
  }
}

export type DocEmitidoSugerencia = {
  tipoDte: number;
  estadoDte: string;
  cesionEstado: string | null;
};

/** Mismos filtros que C5 para sugerencias de cobro. */
export function documentoEmitidoConciliable(doc: DocEmitidoSugerencia): boolean {
  if (doc.estadoDte === "borrador" || doc.estadoDte === "rechazado" || doc.estadoDte === "anulado_nc") {
    return false;
  }
  if (doc.cesionEstado === "cedido") return false;
  return TIPOS_FACTURA_COBRABLE.has(doc.tipoDte);
}

/** Recalcula `monto_cobrado` y `estado_cobro` desde conciliaciones activas confirmadas. */
export async function sincronizarCobroDocumento(
  tx: TenantTx,
  documentoId: string,
): Promise<{ estadoCobro: EstadoCobro; montoCobrado: number }> {
  const doc = await tx.documentoEmitido.findFirst({ where: { id: documentoId } });
  if (!doc || doc.estadoDte === "borrador") {
    throw new Error("DOCUMENTO_NO_EMITIDO");
  }
  const agg = await tx.conciliacionBanco.aggregate({
    where: {
      enlaceId: documentoId,
      tipoEnlace: "documento_emitido",
      activa: true,
      confirmada: true,
    },
    _sum: { monto: true },
  });
  const base = await cobradoAperturaDe(tx, documentoId);
  // Con notas de crédito parciales la factura se salda con monto − NC (regla de Carlos, 4-nov-2026).
  const nc = (await notasCreditoPorDocumento(tx, [doc.id])).get(doc.id) ?? 0;
  const exigible = Math.max(0, doc.montoTotal - nc);
  const montoCobrado = Math.min(exigible, base + Number(agg._sum.monto ?? 0n));
  const estadoCobro = calcularEstadoCobro(exigible, montoCobrado);
  await tx.documentoEmitido.update({
    where: { id: doc.id },
    data: { montoCobrado, estadoCobro },
  });
  return { estadoCobro, montoCobrado };
}

/** @deprecated Use sincronizarCobroDocumento tras crear la conciliación. */
export async function registrarCobroDocumento(
  tx: TenantTx,
  input: { documentoId: string; monto: number; signoMovimiento?: number },
): Promise<{ estadoCobro: EstadoCobro; montoCobrado: number }> {
  const doc = await tx.documentoEmitido.findFirst({ where: { id: input.documentoId } });
  if (!doc) throw new Error("DOCUMENTO_NO_EMITIDO");
  validarDocumentoCobroBanco(doc, input.signoMovimiento ?? input.monto);
  return sincronizarCobroDocumento(tx, input.documentoId);
}
