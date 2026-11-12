// PDF de un documento laboral (CAR-127, PR 4b): texto de la plantilla ya rellenado, con el nombre y
// los datos legales de la empresa tomados de su perfil de marca (ADR-028). Carta, fuentes estándar.
import { PDFDocument, type PDFFont, type PDFPage, rgb, StandardFonts } from "pdf-lib";

export type SegmentoPdf = { texto: string; negrita: boolean; cursiva: boolean };
export type LogoPdf = { bytes: Uint8Array; formato: "png" | "jpg" };
export type MarcaPdf = { nombre: string; pieLegal?: string | null | undefined; colorPrimario?: string | null | undefined };

const ANCHO = 612;
const ALTO = 792;
const MARGEN = 64;
const TAM = 11;
const INTERLINEA = 16;
const ESPACIO_PARRAFO = 8;

function color(hex: string | null | undefined) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? "");
  if (!m?.[1]) return rgb(0.1, 0.1, 0.1);
  const n = parseInt(m[1], 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

type Palabra = { texto: string; fuente: PDFFont };

/** Texto que la fuente estándar (WinAnsi) no puede dibujar se reemplaza por «?» en vez de fallar. */
const seguro = (t: string) => t.replace(/[^\x20-\x7E\xA0-\xFF\n]/g, "?");

export async function generarPdfLaboral(opts: {
  titulo: string;
  marca: MarcaPdf;
  parrafos: readonly (readonly SegmentoPdf[])[];
  logo?: LogoPdf | null | undefined;
}): Promise<{ bytes: Uint8Array; paginas: number }> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(opts.titulo);
  pdf.setProducer("OPAI");
  const f = {
    n: await pdf.embedFont(StandardFonts.Helvetica),
    b: await pdf.embedFont(StandardFonts.HelveticaBold),
    i: await pdf.embedFont(StandardFonts.HelveticaOblique),
    bi: await pdf.embedFont(StandardFonts.HelveticaBoldOblique),
  };
  const acento = color(opts.marca.colorPrimario);
  const logo = opts.logo
    ? await (opts.logo.formato === "png" ? pdf.embedPng(opts.logo.bytes) : pdf.embedJpg(opts.logo.bytes)).catch(() => null)
    : null;
  const paginas: PDFPage[] = [];
  const nueva = () => {
    const p = pdf.addPage([ANCHO, ALTO]);
    paginas.push(p);
    let x = MARGEN;
    if (logo) {
      const alto = Math.min(26, logo.height);
      const ancho = Math.min((logo.width / logo.height) * alto, 110);
      p.drawImage(logo, { x, y: ALTO - 44, width: ancho, height: (ancho * logo.height) / logo.width });
      x += ancho + 10;
    }
    p.drawText(seguro(opts.marca.nombre), { x, y: ALTO - 40, size: 10, font: f.b, color: acento });
    p.drawLine({ start: { x: MARGEN, y: ALTO - 46 }, end: { x: ANCHO - MARGEN, y: ALTO - 46 }, thickness: 0.8, color: acento });
    return p;
  };
  let pagina = nueva();
  let y = ALTO - MARGEN - 14;
  const salto = () => {
    pagina = nueva();
    y = ALTO - MARGEN - 14;
  };
  const centro = opts.titulo.toUpperCase();
  const wt = f.b.widthOfTextAtSize(seguro(centro), 13);
  pagina.drawText(seguro(centro), { x: (ANCHO - wt) / 2, y, size: 13, font: f.b });
  y -= 30;
  const ancho = ANCHO - MARGEN * 2;
  for (const parrafo of opts.parrafos) {
    const palabras: Palabra[] = parrafo.flatMap((s) =>
      seguro(s.texto)
        .split(/\s+/)
        .filter(Boolean)
        .map((texto) => ({ texto, fuente: s.negrita ? (s.cursiva ? f.bi : f.b) : s.cursiva ? f.i : f.n })),
    );
    let linea: Palabra[] = [];
    let usado = 0;
    const espacio = f.n.widthOfTextAtSize(" ", TAM);
    const volcar = () => {
      if (y < MARGEN + 30) salto();
      let x = MARGEN;
      for (const w of linea) {
        pagina.drawText(w.texto, { x, y, size: TAM, font: w.fuente });
        x += w.fuente.widthOfTextAtSize(w.texto, TAM) + espacio;
      }
      y -= INTERLINEA;
      linea = [];
      usado = 0;
    };
    for (const w of palabras) {
      const largo = w.fuente.widthOfTextAtSize(w.texto, TAM);
      if (linea.length && usado + espacio + largo > ancho) volcar();
      usado += (linea.length ? espacio : 0) + largo;
      linea.push(w);
    }
    if (linea.length) volcar();
    y -= ESPACIO_PARRAFO;
  }
  paginas.forEach((p, i) => {
    const pie = [opts.marca.pieLegal, `Página ${i + 1} de ${paginas.length}`].filter(Boolean).join("  ·  ");
    p.drawText(seguro(pie), { x: MARGEN, y: 32, size: 8, font: f.n, color: rgb(0.4, 0.4, 0.4) });
  });
  return { bytes: await pdf.save(), paginas: paginas.length };
}
