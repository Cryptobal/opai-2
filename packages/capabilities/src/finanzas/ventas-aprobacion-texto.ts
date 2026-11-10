import { NOMBRE_TIPO_DTE_VENTA, formatearClp, type TipoDteVenta } from "@opai/domain";

import type { Contexto } from "../types";

/**
 * Texto humano de una aprobación sobre un documento de Ventas (CAR-250): «emitir el borrador de
 * factura electrónica, $ 11.900» o «enviar al SII la factura electrónica 33, $ 11.900».
 * Solo tipo, folio y monto; nunca el receptor ni otros datos.
 */
export function describirDocumento(
  accion: (documento: string, borrador: boolean) => string,
): (ctx: Contexto, input: { documentoId: string }) => Promise<string | null> {
  return async (ctx, input) => {
    const doc = await ctx.db.documentoEmitido.findFirst({
      where: { id: input.documentoId },
      select: { tipoDte: true, folio: true, montoTotal: true, estadoDte: true },
    });
    if (!doc) return null;
    const tipo = (NOMBRE_TIPO_DTE_VENTA[doc.tipoDte as TipoDteVenta] ?? "documento").toLowerCase();
    const documento = `${tipo}${doc.folio == null ? "" : ` ${doc.folio}`}`;
    return `${accion(documento, doc.estadoDte === "borrador")}, ${formatearClp(doc.montoTotal)}`;
  };
}
