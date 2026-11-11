// Totales, monto en palabras, timbre, copia cedible y marca de agua del DTE (CAR-259). Los totales van pegados al
// detalle (como en OPAI 1); el timbre y el acuse ocupan la zona inferior de la última página.
import { degrees, type PDFPage } from "pdf-lib";

import { alDerecha, ALTO, ANCHO, caja, centrado, GRIS, linea, MARGEN, NEGRO, ROJO, type Recursos, texto, XFIN } from "./pdf-base";
import { montoEnPalabras } from "./pdf-palabras";
import { fechaLarga, limpio, pesos, renglones } from "./pdf-texto";
import type { PdfDteInput } from "./pdf-tipos";

/** Alto que la última página deja libre bajo el detalle: «SON … PESOS» y glosa a la izquierda, caja de totales a la derecha. */
export const RESERVA_TOTALES = 92;
/** Desde aquí (distancia desde arriba) hasta el pie empieza la zona del timbre y el acuse. */
export const ZONA_INFERIOR = ALTO - 215;
const CAJA_TOTALES_W = 190;

/** Totales pegados al detalle; devuelve dónde termina el bloque. Omite las filas en cero, salvo el total. */
export function totales(p: PDFPage, d: PdfDteInput, r: Recursos, arriba: number) {
  const filas: [string, number, boolean][] = [];
  if (d.neto > 0) filas.push(["NETO $", d.neto, false]);
  if (d.exento > 0) filas.push(["EXENTO $", d.exento, false]);
  if (d.iva > 0) filas.push(["I.V.A. (19%) $", d.iva, false]);
  filas.push(["TOTAL $", d.total, true]);
  const alto = filas.length * 14 + 6;
  const x = XFIN - CAJA_TOTALES_W;
  caja(p, x, arriba, CAJA_TOTALES_W, alto);
  filas.forEach(([et, v, fuerte], i) => {
    const f = fuerte ? r.negrita : r.normal;
    texto(p, et, x + 8, arriba + 6 + i * 14, f, 9);
    alDerecha(p, pesos(v), XFIN - 8, arriba + 6 + i * 14, f, 9);
  });
  const izquierda = renglones(`SON ${montoEnPalabras(d.total)} PESOS`, 62);
  izquierda.forEach((t, i) => texto(p, t, MARGEN, arriba + 6 + i * 10, r.normal, 8, GRIS));
  const repetida = d.lineas.some((l) => limpio(l.descripcion) === limpio(d.glosa));
  if (d.glosa && !repetida) {
    renglones(d.glosa, 62).slice(0, 5).forEach((t, k) => texto(p, t, MARGEN, arriba + 10 + (izquierda.length + k) * 10, r.normal, 8, NEGRO));
  }
}

/** Timbre PDF417, resolución y verificación; el borrador en cambio avisa que no tiene valor tributario. */
export function pie(p: PDFPage, d: PdfDteInput, r: Recursos) {
  if (d.borrador) {
    centrado(p, "BORRADOR · Sin valor tributario: no tiene folio ni timbre del SII.", ANCHO / 2, ALTO - 30, r.negrita, 9, ROJO);
    return;
  }
  if (r.timbre) p.drawImage(r.timbre, { x: MARGEN, y: 70, width: 200, height: 76 });
  texto(p, "Timbre Electrónico S.I.I.", MARGEN, ALTO - 64, r.normal, 7);
  const res = d.resolucion ? `Res. N° ${d.resolucion.numero} de ${fechaLarga(d.resolucion.fecha)}` : "Resolución: sin datos";
  texto(p, res, MARGEN, ALTO - 54, r.normal, 7);
  texto(p, "Verifique Documento: www.sii.cl", MARGEN, ALTO - 44, r.normal, 7);
}

/** Pie «ORIGINAL» o «CEDIBLE», centrado, como OPAI 1. */
export function marcaCopia(p: PDFPage, r: Recursos, cedible: boolean) {
  centrado(p, cedible ? "CEDIBLE" : "ORIGINAL", ANCHO / 2, ALTO - 28, r.negrita, 10, ROJO);
}

export function acuse(p: PDFPage, r: Recursos) {
  const legal =
    "EL ACUSE DE RECIBO QUE SE DECLARA EN ESTE ACTO, DE ACUERDO A LO DISPUESTO EN LA LETRA b) DEL ART. 4° Y LA LETRA c) DEL ART. 5° DE LA LEY 19.983, ACREDITA QUE LA ENTREGA DE MERCADERÍAS O SERVICIO(S) PRESTADO(S) HA(N) SIDO RECIBIDO(S) EN TOTAL CONFORMIDAD.";
  renglones(legal, 135).forEach((t, i) => texto(p, t, MARGEN, ZONA_INFERIOR + 6 + i * 9, r.normal, 7, GRIS));
  const x = XFIN - 240;
  const arriba = ZONA_INFERIOR + 42;
  caja(p, x, arriba, 240, 100, NEGRO);
  centrado(p, "ACUSE DE RECIBO", x + 120, arriba + 6, r.negrita, 9);
  ["NOMBRE:", "RUT:", "FECHA:", "RECINTO:", "FIRMA:"].forEach((et, i) => {
    texto(p, et, x + 8, arriba + 22 + i * 15, r.negrita, 7);
    linea(p, x + 60, x + 232, arriba + 30 + i * 15, 0.4);
  });
}

/** Marca de agua diagonal «BORRADOR», centrada en la hoja y translúcida para no tapar el contenido. */
export function marcaDeAgua(p: PDFPage, r: Recursos) {
  const size = 96;
  const grados = 30;
  const rad = (grados * Math.PI) / 180;
  const ancho = r.negrita.widthOfTextAtSize("BORRADOR", size);
  const media = size * 0.36;
  p.drawText("BORRADOR", {
    x: ANCHO / 2 - (ancho / 2) * Math.cos(rad) + media * Math.sin(rad),
    y: ALTO / 2 - (ancho / 2) * Math.sin(rad) - media * Math.cos(rad),
    font: r.negrita,
    size,
    color: ROJO,
    opacity: 0.13,
    rotate: degrees(grados),
  });
}
