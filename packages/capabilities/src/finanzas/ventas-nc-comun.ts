import {
  debeAnularDocumentoOriginal,
  existeAnulacionCod1,
  montoEfectivoNotaCredito,
  montoNcAcumuladoMonetario,
  validarEmisionNotaCredito,
  validarMontosVenta,
  type CodigoReferenciaNc,
  type EstadoDteEmitido,
} from "@opai/domain";

import { noEncontrado, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { montosNotaCredito } from "./ventas-comun";

export async function notasCreditoPreviasDe(ctx: Pick<Contexto, "db">, refId: string) {
  return ctx.db.documentoEmitido.findMany({
    // Una NC anulada por nota de débito (56) ya no cuenta: el documento vuelve a poder anularse o corregirse.
    where: { documentoReferenciaId: refId, tipoDte: 61, estadoDte: { not: "anulado_nd" } },
    select: { montoTotal: true, codigoReferencia: true },
  });
}

export function validarNotaCreditoEmision(
  ref: { estadoDte: string; montoTotal: number },
  codigoReferencia: CodigoReferenciaNc,
  montoInput: number,
  previas: { montoTotal: number; codigoReferencia: number | null }[],
) {
  const acumulado = montoNcAcumuladoMonetario(previas);
  const err = validarEmisionNotaCredito({
    refEstadoDte: ref.estadoDte as EstadoDteEmitido,
    refMontoTotal: ref.montoTotal,
    codigoReferencia,
    monto: montoInput,
    acumuladoMonetario: acumulado,
    yaAnuloCod1: existeAnulacionCod1(previas),
  });
  if (err) throw reglaDeNegocio(err);
  const monto = montoEfectivoNotaCredito(codigoReferencia, montoInput);
  return { monto, acumulado, restante: ref.montoTotal - acumulado };
}

/** C4: bloquea el original y revalida tope con NC ya persistidas (misma transacción). */
export async function bloquearYValidarNotaCredito(
  ctx: Pick<Contexto, "tenantId">,
  tx: Contexto["db"],
  refId: string,
  codigoReferencia: CodigoReferenciaNc,
  montoInput: number,
) {
  await tx.$queryRaw`
    SELECT id FROM finanzas.documentos_emitidos
    WHERE id = ${refId}::uuid AND tenant_id = ${ctx.tenantId}::uuid
    FOR UPDATE
  `;
  const ref = await tx.documentoEmitido.findFirst({
    where: { id: refId },
    select: {
      id: true,
      cuentaId: true,
      instalacionId: true,
      cotizacionId: true,
      tipoDte: true,
      folio: true,
      fechaEmision: true,
      fechaVencimiento: true,
      montoNeto: true,
      montoExento: true,
      montoIva: true,
      montoTotal: true,
      estadoDte: true,
    },
  });
  if (!ref) throw noEncontrado("El documento de referencia");
  if (ref.estadoDte !== "aceptado" && ref.estadoDte !== "enviado") {
    throw reglaDeNegocio("La nota de crédito solo referencia documentos emitidos.");
  }
  const folioRef = ref.folio;
  if (folioRef == null || ref.tipoDte === 61) throw reglaDeNegocio("Referencia inválida.");
  const previas = await notasCreditoPreviasDe({ db: tx }, refId);
  const { monto, restante } = validarNotaCreditoEmision(ref, codigoReferencia, montoInput, previas);
  const montos = montosNotaCredito(ref, monto);
  const error = validarMontosVenta(61, montos);
  if (error) throw reglaDeNegocio(error);
  return { ref, folioRef, monto, restante, montos };
}

export { debeAnularDocumentoOriginal };
