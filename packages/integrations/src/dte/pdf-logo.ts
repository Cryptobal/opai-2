import type { PDFDocument, PDFImage } from "pdf-lib";

import type { PdfLogo } from "./pdf-tipos";

/** El logo nunca rompe el documento: si no se puede leer, el PDF sigue con la razón social en texto. */
export async function incrustarLogo(doc: PDFDocument, logo: PdfLogo | undefined): Promise<PDFImage | undefined> {
  if (!logo) return undefined;
  try {
    return logo.formato === "png" ? await doc.embedPng(logo.bytes) : await doc.embedJpg(logo.bytes);
  } catch {
    return undefined;
  }
}
