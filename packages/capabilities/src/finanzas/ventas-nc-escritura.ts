import { CESION_DEFECTO_EMITIDO } from "@opai/domain";

import { aFecha } from "../core/maestros/comun";
import { reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { adaptadorSiiDe } from "./adaptador-sii";
import { consumirFolio } from "./ventas-comun";
import type { NcPreparada } from "./ventas-nc-preparar";
import { debeAnularDocumentoOriginal } from "./ventas-nc-comun";
import { claveXmlDte } from "./ventas-xml";

type RefDoc = {
  id: string;
  cuentaId: string;
  instalacionId: string | null;
  cotizacionId: string | null;
  tipoDte: number;
  folio: number | null;
  fechaEmision: Date | null;
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
  preparada: NcPreparada,
) {
  const folioEmitido = await consumirFolio(ctx, 61, false, tx);
  if (folioEmitido !== preparada.folio) {
    throw reglaDeNegocio("El folio cambió mientras se firmaba la nota de crédito; reintente la emisión.");
  }
  const m = p.montos;
  const f = preparada.montos;
  if (m.neto !== f.neto || m.exento !== f.exento || m.iva !== f.iva || m.total !== f.total) {
    throw reglaDeNegocio("Los montos cambiaron mientras se firmaba la nota de crédito; reintente la emisión.");
  }
  const emision = preparada.fechaEmision;
  const adaptador = await adaptadorSiiDe(ctx);
  const doc = await tx.documentoEmitido.create({
    data: {
      id: preparada.documentoId,
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
      timbrePdf417: preparada.timbrePdf417,
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
          fechaRef: p.ref.fechaEmision,
          codigoRef: p.codigoReferencia,
          razonRef: p.motivo,
        },
      },
    },
  });
  if (adaptador.nombre !== "simulado") {
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
