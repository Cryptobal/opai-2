// Ajuste de texto al ancho real de la fuente (CAR-259). Puro: solo mide con la fuente que recibe.
import type { PDFFont } from "pdf-lib";

import { limpio } from "./pdf-texto";

/** Parte un texto en renglones que quepan en `ancho`; si pasa de `max` renglones, el último termina en «...». */
export function ajustarLineas(texto: string, f: PDFFont, size: number, ancho: number, max: number): string[] {
  const out: string[] = [];
  let actual = "";
  for (const palabra of limpio(texto).split(" ").filter(Boolean)) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (actual && f.widthOfTextAtSize(prueba, size) > ancho) {
      out.push(actual);
      actual = palabra;
    } else actual = prueba;
  }
  if (actual) out.push(actual);
  if (out.length <= max) return out.map((l) => cortar(l, f, size, ancho));
  const visibles = out.slice(0, max);
  visibles[max - 1] = cortar(`${visibles[max - 1]}...`, f, size, ancho);
  return visibles;
}

/** Recorta con «...» una palabra o renglón que de todos modos no cabe. */
export function cortar(s: string, f: PDFFont, size: number, ancho: number): string {
  if (f.widthOfTextAtSize(s, size) <= ancho) return s;
  let n = s.length;
  while (n > 0 && f.widthOfTextAtSize(`${s.slice(0, n)}...`, size) > ancho) n--;
  return `${s.slice(0, n)}...`;
}
