// Encabezado del DTE (CAR-259), como OPAI 1: logo y datos del emisor a la izquierda, recuadro rojo del SII a la derecha.
import type { PDFPage } from "pdf-lib";

import { caja, centrado, MARGEN, NEGRO, ROJO, type Recursos, texto, XFIN } from "./pdf-base";
import { ajustarLineas, cortar } from "./pdf-medidas";
import { formatoRut, renglones } from "./pdf-texto";
import { NOMBRE_DTE, type PdfDteInput } from "./pdf-tipos";

export const TOPE_CABECERA = 44;
export const ALTO_CAJA_SII = 90;
const CAJA_W = 200;

function cajaSii(p: PDFPage, d: PdfDteInput, r: Recursos) {
  const x = XFIN - CAJA_W;
  caja(p, x, TOPE_CABECERA, CAJA_W, ALTO_CAJA_SII, ROJO);
  const centro = (s: string, arriba: number, size: number) => centrado(p, s, x + CAJA_W / 2, TOPE_CABECERA + arriba, r.negrita, size, ROJO);
  centro(`R.U.T.: ${formatoRut(d.emisor.rut)}`, 10, 11);
  const partes = renglones(NOMBRE_DTE[d.tipoDte] ?? `DTE ${d.tipoDte}`, 22);
  partes.forEach((l, i) => centro(l, 28 + i * 13, 11));
  centro(d.borrador ? "BORRADOR" : `N° ${d.folio}`, 28 + partes.length * 13 + 6, 14);
  if (d.oficinaSii) centro(`S.I.I. - ${d.oficinaSii}`, ALTO_CAJA_SII - 16, 8);
}

/** Logo (si la empresa lo tiene), razón social, giro, dirección y teléfono del emisor; lo que falta no se inventa. */
function datosEmisor(p: PDFPage, d: PdfDteInput, r: Recursos) {
  const e = d.emisor;
  let x = MARGEN;
  if (r.logo) {
    const alto = Math.min(50, r.logo.height);
    const ancho = Math.min((r.logo.width / r.logo.height) * alto, 130);
    p.drawImage(r.logo, { x, y: p.getHeight() - TOPE_CABECERA - alto, width: ancho, height: (ancho * r.logo.height) / r.logo.width });
    x += ancho + 12;
  }
  const maxAncho = XFIN - CAJA_W - 16 - x;
  // Una razón social larga baja a un segundo renglón en vez de cortarse.
  const razon = ajustarLineas(e.razon.toUpperCase(), r.negrita, 11, maxAncho, 2);
  razon.forEach((l, i) => texto(p, l, x, TOPE_CABECERA + i * 13, r.negrita, 11, NEGRO));
  const base = TOPE_CABECERA + 4 + razon.length * 13;
  const lineas = [e.giro?.toUpperCase(), e.direccion, [e.comuna, e.ciudad].filter(Boolean).join(", "), e.fono ? `Fono: ${e.fono}` : ""];
  lineas
    .filter((l): l is string => Boolean(l))
    .forEach((l, i) => texto(p, cortar(l, r.normal, 8.5, maxAncho), x, base + i * 11, r.normal, 8.5));
}

export function cabecera(p: PDFPage, d: PdfDteInput, r: Recursos) {
  cajaSii(p, d, r);
  datosEmisor(p, d, r);
}
