// Medidas y utilidades de dibujo comunes a los PDF de la facturación (CAR-221, CAR-259). Todo en puntos, hoja Carta (tamaño SII).
import { type PDFFont, type PDFImage, type PDFPage, rgb } from "pdf-lib";

import { limpio } from "./pdf-texto";

export type Recursos = { normal: PDFFont; negrita: PDFFont; timbre?: PDFImage; logo?: PDFImage };

/** Carta (8,5″ × 11″), el tamaño de la representación impresa del SII, igual que en OPAI 1. */
export const CARTA: [number, number] = [612, 792];
export const ANCHO = CARTA[0];
export const ALTO = CARTA[1];
export const MARGEN = 30;
export const XFIN = ANCHO - MARGEN;

export const ROJO = rgb(0.75, 0.1, 0.1);
export const GRIS = rgb(0.55, 0.55, 0.55);
export const FONDO = rgb(0.91, 0.91, 0.91);
export const NEGRO = rgb(0, 0, 0);

/** Convierte «distancia desde el borde superior» a la coordenada de pdf-lib. */
export const y = (arriba: number) => ALTO - arriba;

export function texto(p: PDFPage, s: string, x: number, arriba: number, f: PDFFont, size = 8, color = NEGRO) {
  p.drawText(limpio(s), { x, y: y(arriba) - size, font: f, size, color });
}

export const alDerecha = (p: PDFPage, s: string, xFin: number, arriba: number, f: PDFFont, size = 8) =>
  texto(p, s, xFin - f.widthOfTextAtSize(limpio(s), size), arriba, f, size);

export const centrado = (p: PDFPage, s: string, xCentro: number, arriba: number, f: PDFFont, size: number, color = NEGRO) =>
  texto(p, s, xCentro - f.widthOfTextAtSize(limpio(s), size) / 2, arriba, f, size, color);

export const caja = (p: PDFPage, x: number, arriba: number, w: number, h: number, color = GRIS) =>
  p.drawRectangle({ x, y: y(arriba + h), width: w, height: h, borderColor: color, borderWidth: color === ROJO ? 1.5 : 0.6 });

export const linea = (p: PDFPage, x1: number, x2: number, arriba: number, grosor = 0.6) =>
  p.drawLine({ start: { x: x1, y: y(arriba) }, end: { x: x2, y: y(arriba) }, thickness: grosor, color: GRIS });

/** Zona inferior reservada a totales, timbre y acuse: el detalle nunca llega más abajo. */
export const TOPE_DETALLE = ALTO - 242;
