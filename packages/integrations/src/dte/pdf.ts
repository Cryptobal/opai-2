// PDF del DTE (factura 33/34, notas 56/61) en A4, con timbre PDF417 gráfico, detalle paginado y copia CEDIBLE (CAR-221).
import { PDFDocument, StandardFonts } from "pdf-lib";

import { A4 } from "./pdf-base";
import { capacidad, medirFila, paginar } from "./pdf-detalle";
import { altoReferencias, dibujarPagina } from "./pdf-pagina";
import { timbrePng } from "./pdf-timbre";
import { llevaCedible, type PdfDteInput } from "./pdf-tipos";

export type { PdfDteInput, PdfLinea, PdfParte, PdfReferencia } from "./pdf-tipos";
export { generarPdfPrevio } from "./pdf-previo";
export type { PdfPrevioInput } from "./pdf-previo";

/** Genera los bytes del PDF: el original (una o más páginas) y, si el tipo se puede ceder, la copia CEDIBLE completa. */
export async function generarPdfDte(input: PdfDteInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(input.borrador ? `Borrador DTE ${input.tipoDte}` : `DTE ${input.tipoDte} N° ${input.folio}`);
  doc.setProducer("OPAI 2.0");
  // Fechas fijas (la de emisión): el mismo documento da siempre los mismos bytes, útil para evidencia reproducible.
  const fechaDoc = new Date(`${input.fechaEmision || "1970-01-01"}T00:00:00Z`);
  doc.setCreationDate(fechaDoc);
  doc.setModificationDate(fechaDoc);
  const recursos = {
    normal: await doc.embedFont(StandardFonts.Helvetica),
    negrita: await doc.embedFont(StandardFonts.HelveticaBold),
    ...(input.timbrePdf417 && !input.borrador ? { timbre: await doc.embedPng(await timbrePng(input.timbrePdf417)) } : {}),
  };
  const filas = input.lineas.map((l, i) => medirFila(l, i + 1));
  const paginas = paginar(filas, capacidad(253 + altoReferencias(input) + 8), capacidad(70));
  for (const conCedible of llevaCedible(input.tipoDte) && !input.borrador ? [false, true] : [false]) {
    paginas.forEach((fp, i) =>
      dibujarPagina(doc.addPage(A4), input, recursos, { numero: i + 1, total: paginas.length, filas: fp, conCedible }),
    );
  }
  return doc.save();
}
