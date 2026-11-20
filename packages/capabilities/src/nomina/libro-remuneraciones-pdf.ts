import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import type { FilaLibroRemuneraciones } from "@opai/domain";

const ANCHO = 842;
const ALTO = 595;
const MARGEN = 36;
const TAM = 7;
const ALTURA_FILA = 14;

const CABECERAS = ["RUT", "Nombre", "Días", "Lic.", "Hab. imp.", "Hab. no imp.", "Desc. leg.", "Otros", "Líquido"] as const;
const ANCHOS = [72, 140, 32, 28, 68, 72, 68, 60, 68];

const clp = (n: number) => n.toLocaleString("es-CL");
const seguro = (t: string) => t.replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");

function celda(page: PDFPage, x: number, y: number, texto: string, font: PDFFont) {
  page.drawText(seguro(texto), { x, y, size: TAM, font, color: rgb(0.1, 0.1, 0.1) });
}

/** PDF landscape del libro: una tabla por página si no cabe. */
export async function pdfLibroRemuneraciones(
  titulo: string,
  filas: readonly FilaLibroRemuneraciones[],
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(titulo);
  pdf.setProducer("OPAI");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([ANCHO, ALTO]);
  let y = ALTO - MARGEN;
  page.drawText(seguro(titulo), { x: MARGEN, y, size: 12, font: bold });
  y -= 22;
  const dibujarCabecera = () => {
    let x = MARGEN;
    CABECERAS.forEach((h, i) => {
      page.drawText(h, { x, y, size: TAM, font: bold });
      x += ANCHOS[i] ?? 60;
    });
    y -= ALTURA_FILA;
  };
  dibujarCabecera();
  for (const f of filas) {
    if (y < MARGEN + ALTURA_FILA) {
      page = pdf.addPage([ANCHO, ALTO]);
      y = ALTO - MARGEN - 10;
      dibujarCabecera();
    }
    const vals = [
      f.rut,
      f.nombre.length > 28 ? `${f.nombre.slice(0, 27)}…` : f.nombre,
      String(f.diasTrabajados),
      String(f.diasLicencia),
      clp(f.haberesImponibles),
      clp(f.haberesNoImponibles),
      clp(f.descuentosLegales),
      clp(f.otrosDescuentos),
      clp(f.liquido),
    ];
    let x = MARGEN;
    vals.forEach((v, i) => {
      celda(page, x, y, v, font);
      x += ANCHOS[i] ?? 60;
    });
    y -= ALTURA_FILA;
  }
  return pdf.save();
}