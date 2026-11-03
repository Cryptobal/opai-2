import { CESION_DEFECTO_EMITIDO } from "@opai/domain";

import { aFecha, hoy } from "../core/maestros/comun";
import { reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { adaptadorSiiDe } from "./adaptador-sii";
import { consumirFolio, cuentaDe } from "./ventas-comun";
import { payloadEmisionDteDe } from "./ventas-payload-emision";
import { debeAnularDocumentoOriginal } from "./ventas-nc-comun";
import { guardarXmlFirmadoDte, claveXmlDte } from "./ventas-xml";

type RefDoc = {
  id: string;
  cuentaId: string;
  instalacionId: string | null;
  cotizacionId: string | null;
  tipoDte: number;
  folio: number | null;
  fechaVencimiento: Date | null;
  montoNeto: number;
  montoExento: number;
  montoIva: number;
  montoTotal: number;
};

type MontosNc = { neto: number; exento: number; iva: number; total: number };

export async function persistirNotaCredito(
  ctx: Contexto,
  p: {
    ref: RefDoc;
    folioRef: number;
    rutReceptor: string;
    razonSocialReceptor: string;
    ambiente: "certificacion" | "produccion";
    rutEmisor: string;
    montos: MontosNc;
    motivo: string;
    codigoReferencia: 1 | 2 | 3;
    montoLinea: number;
    monto: number;
    restante: number;
  },
  tx: Contexto["db"],
) {
  const folioEmitido = await consumirFolio(ctx, 61, false, tx);
  const emision = hoy();
  const adaptador = await adaptadorSiiDe(ctx);
  const cuenta = await cuentaDe(ctx, p.ref.cuentaId);
  const rutReceptor = cuenta.rut;
  if (!rutReceptor) throw reglaDeNegocio("El cliente debe tener RUT para emitir la nota de crédito.");
  const payload = await payloadEmisionDteDe(ctx, {
    ambiente: p.ambiente,
    rutEmisor: p.rutEmisor,
    cuenta: { ...cuenta, rut: rutReceptor },
    doc: {
      tipoDte: 61,
      folio: folioEmitido,
      fechaEmision: emision,
      glosa: p.motivo,
      montoNeto: p.montos.neto,
      montoExento: p.montos.exento,
      montoIva: p.montos.iva,
      montoTotal: p.montos.total,
      lineas: [{ orden: 0, glosa: p.motivo, monto: p.montoLinea }],
      referencias: [
        {
          tipoDteRef: p.ref.tipoDte,
          folioRef: p.folioRef,
          codigoRef: p.codigoReferencia,
          razonRef: p.motivo,
        },
      ],
    },
    incluirCaf: adaptador.nombre !== "simulado",
  });
  const firmado = await adaptador.firmar(payload);
  const doc = await tx.documentoEmitido.create({
    data: {
      tenantId: ctx.tenantId,
      cuentaId: p.ref.cuentaId,
      instalacionId: p.ref.instalacionId,
      cotizacionId: p.ref.cotizacionId,
      tipoDte: 61,
      folio: folioEmitido,
      fechaEmision: aFecha(emision),
      fechaVencimiento: p.ref.fechaVencimiento,
      montoNeto: p.montos.neto,
      montoExento: p.montos.exento,
      montoIva: p.montos.iva,
      montoOtros: 0,
      montoTotal: p.montos.total,
      estadoDte: "enviado",
      glosa: p.motivo,
      timbrePdf417: firmado.timbrePdf417,
      documentoReferenciaId: p.ref.id,
      codigoReferencia: p.codigoReferencia,
      motivoNc: p.motivo,
      cesionEstado: CESION_DEFECTO_EMITIDO,
      lineas: {
        create: [{ tenantId: ctx.tenantId, orden: 0, glosa: p.motivo, monto: p.montoLinea }],
      },
      referencias: {
        create: {
          tenantId: ctx.tenantId,
          tipoDteRef: p.ref.tipoDte,
          folioRef: p.folioRef,
          codigoRef: p.codigoReferencia,
          razonRef: p.motivo,
        },
      },
    },
  });
  if (adaptador.nombre !== "simulado") {
    await guardarXmlFirmadoDte(ctx, doc.id, firmado.xml);
    await tx.documentoEmitido.update({
      where: { id: doc.id },
      data: { xmlStorageKey: claveXmlDte(doc.id) },
    });
  }
  if (debeAnularDocumentoOriginal(p.codigoReferencia, p.monto, p.restante)) {
    const { count } = await tx.documentoEmitido.updateMany({
      where: { id: p.ref.id, estadoDte: { in: ["enviado", "aceptado"] } },
      data: { estadoDte: "anulado_nc" },
    });
    if (count !== 1) {
      throw reglaDeNegocio("No se pudo marcar el documento original como anulado; reintente.");
    }
  }
  return { doc, folioEmitido };
}
