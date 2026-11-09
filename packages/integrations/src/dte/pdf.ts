// PDF del DTE (factura 33/34, notas 56/61) en Carta, con timbre PDF417 gráfico y copia CEDIBLE (CAR-221).
import { PDFDocument, StandardFonts } from "pdf-lib";

import { dibujarPagina } from "./pdf-pagina";
import { timbrePng } from "./pdf-timbre";
import { llevaCedible, type PdfDteInput } from "./pdf-tipos";

export type { PdfDteInput, PdfLinea, PdfParte, PdfReferencia } from "./pdf-tipos";

const CARTA: [number, number] = [612, 792];

/** Genera los bytes del PDF: una página y, si el tipo se puede ceder, la copia CEDIBLE. */
export async function generarPdfDte(input: PdfDteInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`DTE ${input.tipoDte} N° ${input.folio}`);
  doc.setProducer("OPAI 2.0");
  // Fechas fijas (la de emisión): el mismo documento da siempre los mismos bytes, útil para evidencia reproducible.
  const fechaDoc = new Date(`${input.fechaEmision || "1970-01-01"}T00:00:00Z`);
  doc.setCreationDate(fechaDoc);
  doc.setModificationDate(fechaDoc);
  const recursos = {
    normal: await doc.embedFont(StandardFonts.Helvetica),
    negrita: await doc.embedFont(StandardFonts.HelveticaBold),
    timbre: await doc.embedPng(await timbrePng(input.timbrePdf417)),
  };
  dibujarPagina(doc.addPage(CARTA), input, recursos, false);
  if (llevaCedible(input.tipoDte)) dibujarPagina(doc.addPage(CARTA), input, recursos, true);
  return doc.save();
}
