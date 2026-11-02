import {
  debeAnularDocumentoOriginal,
  existeAnulacionCod1,
  montoEfectivoNotaCredito,
  montoNcAcumuladoMonetario,
  validarEmisionNotaCredito,
  type CodigoReferenciaNc,
  type EstadoDteEmitido,
} from "@opai/domain";

import { reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";

export async function notasCreditoPreviasDe(ctx: Pick<Contexto, "db">, refId: string) {
  return ctx.db.documentoEmitido.findMany({
    where: { documentoReferenciaId: refId, tipoDte: 61 },
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

export { debeAnularDocumentoOriginal };
