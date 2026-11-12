// PDF del DTE (factura 33/34, notas 56/61) en Carta, con el diseño de OPAI 1: logo, recuadro SII, receptor en dos columnas,
// detalle con descripción, totales y monto en palabras, timbre PDF417 gráfico y copia CEDIBLE (CAR-221, CAR-259).
import { PDFDocument, StandardFonts } from "pdf-lib";

import { CARTA } from "./pdf-base";
import { medirFila, paginar } from "./pdf-detalle";
import { dibujarPagina, geometriaPrimera } from "./pdf-pagina";
import { timbrePng } from "./pdf-timbre";
import { RESERVA_TOTALES, ZONA_INFERIOR } from "./pdf-totales";
import { incrustarLogo } from "./pdf-logo";
import { llevaCedible, type PdfDteInput } from "./pdf-tipos";

export type { PdfDteInput, PdfLinea, PdfLogo, PdfParte, PdfReferencia } from "./pdf-tipos";
export { generarPdfPrevio } from "./pdf-previo";
export type { PdfPrevioInput } from "./pdf-previo";
export { montoEnPalabras } from "./pdf-palabras";

/** Alto útil bajo la tabla de una página intermedia: hasta el pie de página. */
const LIMITE_PAGINA = CARTA[1] - 60;

/** Genera los bytes del PDF: el original (una o más páginas) y, si el tipo se puede ceder, la copia CEDIBLE completa. */
export async function generarPdfDte(input: PdfDteInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(input.borrador ? `Borrador DTE ${input.tipoDte}` : `DTE ${input.tipoDte} N° ${input.folio}`);
  doc.setProducer("OPAI 2.0");
  // Fechas fijas (la de emisión): el mismo documento da siempre los mismos bytes, útil para evidencia reproducible.
  const fechaDoc = new Date(`${input.fechaEmision || "1970-01-01"}T00:00:00Z`);
  doc.setCreationDate(fechaDoc);
  doc.setModificationDate(fechaDoc);
  const logo = await incrustarLogo(doc, input.logo);
  const recursos = {
    normal: await doc.embedFont(StandardFonts.Helvetica),
    negrita: await doc.embedFont(StandardFonts.HelveticaBold),
    ...(logo ? { logo } : {}),
    ...(input.timbrePdf417 && !input.borrador ? { timbre: await doc.embedPng(await timbrePng(input.timbrePdf417)) } : {}),
  };
  const geo = geometriaPrimera(input, recursos);
  const filas = input.lineas.map((l, i) => medirFila(l, i + 1));
  // Las filas ocupan hasta el pie; la última página deja sitio a los totales y a la zona del timbre y el acuse.
  const util = (cabTop: number, hasta: number) => hasta - (cabTop + 22);
  const paginas = paginar(filas, util(geo.cabTop, LIMITE_PAGINA), util(70, LIMITE_PAGINA), {
    primera: util(geo.cabTop, ZONA_INFERIOR) - RESERVA_TOTALES,
    cont: util(70, ZONA_INFERIOR) - RESERVA_TOTALES,
  });
  for (const conCedible of llevaCedible(input.tipoDte) && !input.borrador ? [false, true] : [false]) {
    paginas.forEach((fp, i) =>
      dibujarPagina(doc.addPage(CARTA), input, recursos, { numero: i + 1, total: paginas.length, filas: fp, conCedible }, geo),
    );
  }
  return doc.save();
}
