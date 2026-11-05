import { generarPdfDte } from "@opai/integrations";

import { reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { cuentaDe, receptorDteDe, rutEmisorDe } from "./ventas-comun";

type DocPdf = {
  tipoDte: number;
  folio: number | null;
  timbrePdf417: string | null;
  fechaEmision: Date | null;
  cuentaId: string;
  montoNeto: number;
  montoExento: number;
  montoIva: number;
  montoTotal: number;
  glosa: string | null;
};

/** Representación impresa (PDF) de un documento emitido y firmado; la usan la ficha y el envío al cliente. */
export async function pdfDeDocumento(ctx: Contexto, doc: DocPdf): Promise<Uint8Array> {
  if (doc.folio == null || !doc.timbrePdf417) {
    throw reglaDeNegocio("Solo hay PDF para documentos emitidos y firmados.");
  }
  const [cuenta, rutEmisor, tenant] = await Promise.all([
    cuentaDe(ctx, doc.cuentaId),
    rutEmisorDe(ctx),
    ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { nombre: true } }),
  ]);
  return generarPdfDte({
    tipoDte: doc.tipoDte,
    folio: doc.folio,
    fechaEmision: doc.fechaEmision?.toISOString().slice(0, 10) ?? "",
    emisorRazon: tenant?.nombre ?? "Emisor",
    emisorRut: rutEmisor,
    receptorRazon: receptorDteDe(cuenta).razonSocialReceptor,
    receptorRut: cuenta.rut ?? "66000000-0",
    neto: doc.montoNeto,
    exento: doc.montoExento,
    iva: doc.montoIva,
    total: doc.montoTotal,
    timbrePdf417: doc.timbrePdf417,
    ...(doc.glosa ? { glosa: doc.glosa } : {}),
  });
}
