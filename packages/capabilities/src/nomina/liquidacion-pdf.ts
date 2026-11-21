import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import type { DatosLiquidacionPdf } from "@opai/domain";

const MARGEN = 48;
const TAM = 10;
const ALTURA = 16;

const clp = (n: number) => n.toLocaleString("es-CL");
const seguro = (t: string) => t.replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");

function linea(page: PDFPage, normal: PDFFont, fuerte: PDFFont, y: number, izq: string, der: string, bold = false) {
  const f = bold ? fuerte : normal;
  page.drawText(seguro(izq), { x: MARGEN, y, size: TAM, font: f, color: rgb(0.1, 0.1, 0.1) });
  page.drawText(seguro(der), { x: 360, y, size: TAM, font: f, color: rgb(0.1, 0.1, 0.1) });
}

function bloque(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  y0: number,
  titulo: string,
  lineas: readonly { concepto: string; monto: number }[],
  total: number,
) {
  let y = y0;
  page.drawText(titulo, { x: MARGEN, y, size: TAM + 1, font: bold });
  y -= ALTURA + 4;
  for (const l of lineas) {
    linea(page, font, bold, y, l.concepto, `$ ${clp(l.monto)}`);
    y -= ALTURA;
  }
  linea(page, font, bold, y, "Total", `$ ${clp(total)}`, true);
  return y - ALTURA - 8;
}

/** PDF de una liquidación (portal trabajador, CAR-99). */
export async function pdfLiquidacion(d: DatosLiquidacionPdf): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Liquidación ${d.periodo} · ${d.nombre}`);
  pdf.setProducer("OPAI");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595, 842]);
  let y = 842 - MARGEN;
  page.drawText(seguro(d.empresa), { x: MARGEN, y, size: 14, font: bold });
  y -= 22;
  page.drawText(`Liquidación · ${seguro(d.periodo)}`, { x: MARGEN, y, size: 12, font: bold });
  y -= 20;
  page.drawText(`${seguro(d.nombre)} · ${seguro(d.rut)} · ${d.diasTrabajados} días trabajados`, {
    x: MARGEN,
    y,
    size: TAM,
    font,
  });
  y -= 28;
  const sum = (xs: readonly { monto: number }[]) => xs.reduce((s, x) => s + x.monto, 0);
  y = bloque(page, font, bold, y, "Haberes", d.haberes, sum(d.haberes));
  const desc = [...d.descuentosLegales, ...d.otrosDescuentos];
  y = bloque(page, font, bold, y, "Descuentos", desc, sum(desc));
  linea(page, font, bold, y, "Líquido a pagar", `$ ${clp(d.liquido)}`, true);
  y -= ALTURA + 12;
  page.drawText(`Imponible $ ${clp(d.imponible)} · Costo empresa $ ${clp(d.costoEmpresa)}`, {
    x: MARGEN,
    y,
    size: 8,
    font,
    color: rgb(0.35, 0.35, 0.35),
  });
  return pdf.save();
}