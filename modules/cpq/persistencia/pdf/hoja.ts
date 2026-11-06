/** Hoja A4 con márgenes de impresión: cursor vertical, párrafos con corte de línea y pie en cada página. */
import { degrees, rgb, type PDFImage, type PDFPage, type PDFDocument } from "pdf-lib";

import { LINEA, TENUE, TEXTO, type Rgb } from "./colores";
import type { Fuentes } from "./fuentes";

export const A4 = { ancho: 595.28, alto: 841.89 } as const;
export const MARGEN = { x: 56.7, arriba: 62, abajo: 68 } as const;
export const ANCHO_UTIL = A4.ancho - 2 * MARGEN.x;

export type EstiloTexto = {
  tam?: number;
  fuente?: keyof Fuentes;
  color?: Rgb;
  x?: number;
  ancho?: number;
  alinear?: "izq" | "der";
  interlineado?: number;
};

const color = (c: Rgb) => rgb(c[0] / 255, c[1] / 255, c[2] / 255);

export class Hoja {
  pagina!: PDFPage;
  y = 0;
  constructor(
    readonly doc: PDFDocument,
    readonly f: Fuentes,
    readonly acento: Rgb,
  ) {
    this.nueva();
  }

  nueva(): void {
    this.pagina = this.doc.addPage([A4.ancho, A4.alto]);
    this.y = A4.alto - MARGEN.arriba;
  }

  asegurar(alto: number): void {
    if (this.y - alto < MARGEN.abajo) this.nueva();
  }

  espacio(n: number): void {
    this.y -= n;
  }

  /** Reemplaza lo que la fuente no dibuja y los saltos de línea por espacios. */
  limpiar(texto: string, fuente: keyof Fuentes): string {
    const set = new Set(this.f[fuente].getCharacterSet());
    return [...texto.replace(/\s+/g, " ")]
      .map((c) => (set.has(c.codePointAt(0) ?? 0) ? c : "?"))
      .join("");
  }

  ancho(texto: string, tam: number, fuente: keyof Fuentes = "normal"): number {
    return this.f[fuente].widthOfTextAtSize(this.limpiar(texto, fuente), tam);
  }

  /** Corta por palabras al ancho dado; una palabra más larga que la línea se parte por caracteres. */
  cortar(texto: string, tam: number, fuente: keyof Fuentes, ancho: number): string[] {
    const salida: string[] = [];
    let actual = "";
    const medir = (s: string) => this.ancho(s, tam, fuente);
    for (const palabra of this.limpiar(texto, fuente).split(" ").filter(Boolean)) {
      const prueba = actual ? `${actual} ${palabra}` : palabra;
      if (medir(prueba) <= ancho) {
        actual = prueba;
        continue;
      }
      if (actual) salida.push(actual);
      let resto = palabra;
      while (medir(resto) > ancho && resto.length > 1) {
        let n = resto.length - 1;
        while (n > 1 && medir(resto.slice(0, n)) > ancho) n -= 1;
        salida.push(resto.slice(0, n));
        resto = resto.slice(n);
      }
      actual = resto;
    }
    if (actual) salida.push(actual);
    return salida.length ? salida : [""];
  }

  /** Dibuja una línea en (x, y de baseline) sin mover el cursor. */
  linea(texto: string, y: number, e: EstiloTexto = {}): void {
    const tam = e.tam ?? 9.5;
    const fuente = e.fuente ?? "normal";
    const limpio = this.limpiar(texto, fuente);
    const ancho = e.ancho ?? ANCHO_UTIL;
    const x0 = e.x ?? MARGEN.x;
    const x = e.alinear === "der" ? x0 + ancho - this.ancho(limpio, tam, fuente) : x0;
    this.pagina.drawText(limpio, {
      x,
      y,
      size: tam,
      font: this.f[fuente],
      color: color(e.color ?? TEXTO),
    });
  }

  /** Párrafo con salto de página automático; deja el cursor bajo la última línea. */
  parrafo(texto: string, e: EstiloTexto = {}): void {
    const tam = e.tam ?? 9.5;
    const paso = tam * (e.interlineado ?? 1.45);
    for (const l of this.cortar(texto, tam, e.fuente ?? "normal", e.ancho ?? ANCHO_UTIL)) {
      this.asegurar(paso);
      this.y -= paso;
      this.linea(l, this.y + (paso - tam) / 2 - 1, e);
    }
  }

  regla(c: Rgb = LINEA, grosor = 0.6, x1 = MARGEN.x, x2 = A4.ancho - MARGEN.x): void {
    this.pagina.drawLine({
      start: { x: x1, y: this.y },
      end: { x: x2, y: this.y },
      thickness: grosor,
      color: color(c),
    });
  }

  rect(x: number, y: number, w: number, h: number, c: Rgb): void {
    this.pagina.drawRectangle({ x, y, width: w, height: h, color: color(c) });
  }

  imagen(img: PDFImage, x: number, yTop: number, maxAncho: number, maxAlto: number): number {
    const k = Math.min(maxAncho / img.width, maxAlto / img.height, 1);
    this.pagina.drawImage(img, {
      x,
      y: yTop - img.height * k,
      width: img.width * k,
      height: img.height * k,
    });
    return img.height * k;
  }

  /** Pie en todas las páginas («Página n de m») y, si corresponde, la marca de agua diagonal. */
  cerrar(opciones: { pie: string; marcaAgua: string | null }): void {
    const paginas = this.doc.getPages();
    paginas.forEach((p, i) => {
      this.pagina = p;
      this.y = MARGEN.abajo - 14;
      this.regla();
      const ancho = ANCHO_UTIL / 2 - 8;
      this.linea(this.cortar(opciones.pie, 7.5, "normal", ancho)[0] ?? "", MARGEN.abajo - 28, {
        tam: 7.5,
        color: TENUE,
        ancho,
      });
      this.linea(`Página ${i + 1} de ${paginas.length}`, MARGEN.abajo - 28, {
        tam: 7.5,
        color: TENUE,
        fuente: "mono",
        alinear: "der",
      });
      if (opciones.marcaAgua) {
        const tam = opciones.marcaAgua.length > 12 ? 58 : 96;
        const w = this.ancho(opciones.marcaAgua, tam, "negrita");
        p.drawText(this.limpiar(opciones.marcaAgua, "negrita"), {
          x: A4.ancho / 2 - (w / 2) * Math.cos(Math.PI / 4),
          y: A4.alto / 2 - (w / 2) * Math.sin(Math.PI / 4),
          size: tam,
          font: this.f.negrita,
          color: rgb(0.85, 0.85, 0.87),
          rotate: degrees(45),
          opacity: 0.55,
        });
      }
    });
  }
}
