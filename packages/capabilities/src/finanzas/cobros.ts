import type { TenantTx } from "@opai/db";

import { reglaDeNegocio } from "../errores";

/** Estados de cobro del libro de ventas (única función que escribe `estado_cobro`). */
export type EstadoCobro = "pendiente" | "pagada_parcial" | "pagada";

const TIPOS_FACTURA_COBRABLE = new Set([33, 34]);

export function calcularEstadoCobro(montoTotal: number, montoCobrado: number): EstadoCobro {
  if (montoCobrado <= 0) return "pendiente";
  if (montoCobrado + 1 >= montoTotal) return "pagada";
  return "pagada_parcial";
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
  const montoCobrado = Math.min(doc.montoTotal, Number(agg._sum.monto ?? 0n));
  const estadoCobro = calcularEstadoCobro(doc.montoTotal, montoCobrado);
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
