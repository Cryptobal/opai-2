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

/** Monto total en CLP de documentos de Ventas, para las reglas de aprobación (CAR-252). */
export async function montoDocumentos(ctx: Contexto, ids: readonly string[]): Promise<number | null> {
  const docs = await ctx.db.documentoEmitido.findMany({
    where: { id: { in: [...ids] } },
    select: { montoTotal: true },
  });
  return docs.length === ids.length ? docs.reduce((s, d) => s + d.montoTotal, 0) : null;
}

/** Tras aprobar una emisión, el documento firmado se envía al SII, como hace la pantalla (ADR-096, CAR-253). */
export function enviarAlSiiTrasAprobar(doc: { id: string }) {
  return [{ capability: "finanzas.ventas.enviar_sii", input: { documentoId: doc.id } }];
}

/** Lo mismo para el lote del cierre: cada documento que quedó emitido, uno por uno. */
export function enviarEmitidosAlSii(s: { resultados: { documentoId: string; estado: string }[] }) {
  return s.resultados
    .filter((r) => r.estado === "emitido")
    .flatMap((r) => enviarAlSiiTrasAprobar({ id: r.documentoId }));
}

/** Emitir al SII un documento ya armado: la regla mira su monto total. */
export const aprobableDocumento = {
  accion: "emitir_dte" as const,
  monto: (ctx: Contexto, i: { documentoId: string }) => montoDocumentos(ctx, [i.documentoId]),
  siguientes: enviarAlSiiTrasAprobar,
};
