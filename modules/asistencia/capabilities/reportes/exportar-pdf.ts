import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import type { z } from "zod";

import type { cabeceraSchema } from "./esquema";

type Cabecera = z.infer<typeof cabeceraSchema>;
type Col = { clave: string; etiqueta: string };
type Fila = Record<string, string | number | boolean | null>;

const MARGEN = 40;

export async function pdfReporteDt(
  titulo: string,
  cabecera: Cabecera,
  columnas: Col[],
  filas: Fila[],
): Promise<string> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 800;
  const line = (txt: string, f = font, size = 10) => {
    if (y < 60) {
      page = pdf.addPage([595, 842]);
      y = 800;
    }
    page.drawText(txt.slice(0, 110), { x: MARGEN, y, size, font: f, color: rgb(0.1, 0.1, 0.1) });
    y -= size + 4;
  };
  line(titulo, bold, 14);
  line(`Razón social: ${cabecera.razonSocial}`);
  line(`RUT empleador: ${cabecera.rutEmpleador}`);
  if (cabecera.trabajador) line(`Trabajador: ${cabecera.trabajador}`);
  if (cabecera.rutTrabajador) line(`RUT trabajador: ${cabecera.rutTrabajador}`);
  line(`Lugar: ${cabecera.lugar}`);
  line(`Período: ${cabecera.periodo}`);
  line("");
  line(columnas.map((c) => c.etiqueta).join(" · "), bold, 9);
  for (const f of filas.slice(0, 500)) {
    line(columnas.map((c) => String(f[c.clave] ?? "")).join(" · "), font, 8);
  }
  return Buffer.from(await pdf.save()).toString("base64");
}