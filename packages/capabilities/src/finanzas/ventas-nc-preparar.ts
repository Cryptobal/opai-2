// Firma de la nota de crédito FUERA de la transacción de base (CAR-196), con el folio que se asignaría y un id
// de documento generado aquí para guardar el XML antes de crear la fila. La transacción de emisión revalida
// folio y montos contra lo firmado (ver `persistirNotaCredito`).
import { randomUUID } from "node:crypto";

import { z } from "zod";

import { validarMontosVenta, type CodigoReferenciaNc } from "@opai/domain";

import { hoy } from "../core/maestros/comun";
import { noEncontrado, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { adaptadorSiiDe } from "./adaptador-sii";
import { ambienteDe, cuentaDe, montosNotaCredito, rutEmisorDe } from "./ventas-comun";
import { foliosPrevistos } from "./ventas-folios-logica";
import { notasCreditoPreviasDe, validarNotaCreditoEmision } from "./ventas-nc-comun";
import { payloadEmisionDteDe } from "./ventas-payload-emision";
import { guardarXmlFirmadoDte } from "./ventas-xml";

export type NcPreparada = {
  documentoId: string;
  folio: number;
  fechaEmision: string;
  timbrePdf417: string;
  montos: { neto: number; exento: number; iva: number; total: number };
};

const ncPreparadaSchema = z.object({
  documentoId: z.string(),
  folio: z.number().int(),
  fechaEmision: z.string(),
  timbrePdf417: z.string(),
  montos: z.object({ neto: z.number(), exento: z.number(), iva: z.number(), total: z.number() }),
});

export const leerNcPreparada = (preparado: unknown): NcPreparada | null => {
  const r = ncPreparadaSchema.safeParse(preparado);
  return r.success ? r.data : null;
};

export async function prepararNotaCredito(
  ctx: Contexto,
  input: { documentoReferenciaId: string; monto: number; motivo: string; codigoReferencia: CodigoReferenciaNc },
): Promise<NcPreparada> {
  const ref = await ctx.db.documentoEmitido.findFirst({ where: { id: input.documentoReferenciaId } });
  if (!ref) throw noEncontrado("El documento de referencia");
  if (ref.estadoDte !== "aceptado" && ref.estadoDte !== "enviado") {
    throw reglaDeNegocio("La nota de crédito solo referencia documentos emitidos.");
  }
  if (ref.folio == null || ref.tipoDte === 61) throw reglaDeNegocio("Referencia inválida.");
  const cuenta = await cuentaDe(ctx, ref.cuentaId);
  if (!cuenta.rut) throw reglaDeNegocio("El cliente debe tener RUT para emitir la nota de crédito.");
  const previas = await notasCreditoPreviasDe(ctx, ref.id);
  const { monto } = validarNotaCreditoEmision(ref, input.codigoReferencia, input.monto, previas);
  const montos = montosNotaCredito(ref, monto);
  const error = validarMontosVenta(61, montos);
  if (error) throw reglaDeNegocio(error);
  const adaptador = await adaptadorSiiDe(ctx);
  if (!adaptador.disponible) throw reglaDeNegocio("El adaptador SII no está disponible.");
  const folio = (await foliosPrevistos(ctx, 61, 1))[0];
  if (folio == null) throw reglaDeNegocio("No hay folios disponibles para el DTE 61. Cargue un CAF.");
  const emision = hoy();
  const documentoId = randomUUID();
  const payload = await payloadEmisionDteDe(ctx, {
    ambiente: await ambienteDe(ctx),
    rutEmisor: await rutEmisorDe(ctx),
    cuenta: { ...cuenta, rut: cuenta.rut },
    doc: {
      tipoDte: 61,
      folio,
      fechaEmision: emision,
      ...(ref.fechaVencimiento ? { fechaVencimiento: ref.fechaVencimiento.toISOString().slice(0, 10) } : {}),
      glosa: input.motivo,
      montoNeto: montos.neto,
      montoExento: montos.exento,
      montoIva: montos.iva,
      montoTotal: montos.total,
      lineas: [{ orden: 0, glosa: input.motivo, monto }],
      referencias: [
        { tipoDteRef: ref.tipoDte, folioRef: ref.folio, codigoRef: input.codigoReferencia, razonRef: input.motivo },
      ],
    },
    incluirCaf: adaptador.nombre !== "simulado",
  });
  const firmado = await adaptador.firmar(payload);
  if (adaptador.nombre !== "simulado") await guardarXmlFirmadoDte(ctx, documentoId, firmado.xml);
  return {
    documentoId,
    folio,
    fechaEmision: emision,
    timbrePdf417: firmado.timbrePdf417,
    montos: { neto: montos.neto, exento: montos.exento, iva: montos.iva, total: montos.total },
  };
}
