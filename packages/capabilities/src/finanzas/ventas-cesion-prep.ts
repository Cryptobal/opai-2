import { existeAnulacionCod1, puedeCederDocumento, simularCesion } from "@opai/domain";

import { noEncontrado, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { notasCreditoPreviasDe } from "./ventas-nc-comun";

/** Carga la factura, aplica las reglas de cesión y calcula anticipo/merma (ceder y simular). */
export async function prepararCesion(ctx: Contexto, documentoId: string, tasaBps: number) {
  const doc = await ctx.db.documentoEmitido.findFirst({ where: { id: documentoId } });
  if (!doc) throw noEncontrado("El documento");
  const previas = await notasCreditoPreviasDe(ctx, doc.id);
  const bloqueo = puedeCederDocumento({
    tipoDte: doc.tipoDte,
    estadoDte: doc.estadoDte,
    cesionEstado: doc.cesionEstado,
    xmlStorageKey: doc.xmlStorageKey,
    estadoCobro: doc.estadoCobro,
    montoTotal: doc.montoTotal,
    montoCobrado: doc.montoCobrado,
    anuladaPorNc: existeAnulacionCod1(previas),
  });
  if (bloqueo) throw reglaDeNegocio(bloqueo);
  return { doc, calc: simularCesion(doc.montoTotal, tasaBps) };
}
