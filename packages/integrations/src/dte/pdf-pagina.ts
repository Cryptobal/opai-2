// Una página del DTE en tamaño Carta, con el orden de la factura de OPAI 1.0 (CAR-221).
import { type PDFFont, type PDFImage, type PDFPage, rgb } from "pdf-lib";

import { CODIGO_REF, NOMBRE_DTE, NOMBRE_REF, type PdfDteInput } from "./pdf-tipos";
import { fechaCorta, fechaLarga, limpio, pesos, renglones } from "./pdf-texto";

export type Recursos = { normal: PDFFont; negrita: PDFFont; timbre: PDFImage };

const ALTO = 792;
const ROJO = rgb(0.75, 0.1, 0.1);
const GRIS = rgb(0.55, 0.55, 0.55);
const FONDO = rgb(0.91, 0.91, 0.91);
const NEGRO = rgb(0, 0, 0);
const y = (arriba: number) => ALTO - arriba;

function texto(p: PDFPage, s: string, x: number, arriba: number, f: PDFFont, size = 8, color = NEGRO) {
  p.drawText(limpio(s), { x, y: y(arriba) - size, font: f, size, color });
}
const alDerecha = (p: PDFPage, s: string, xFin: number, arriba: number, f: PDFFont, size = 8) =>
  texto(p, s, xFin - f.widthOfTextAtSize(limpio(s), size), arriba, f, size);
const caja = (p: PDFPage, x: number, arriba: number, w: number, h: number, color = GRIS) =>
  p.drawRectangle({ x, y: y(arriba + h), width: w, height: h, borderColor: color, borderWidth: color === ROJO ? 1.5 : 0.6 });

function cabecera(p: PDFPage, d: PdfDteInput, r: Recursos) {
  const e = d.emisor;
  texto(p, e.razon, 28, 66, r.negrita, 11);
  const datos = [e.giro, e.direccion, [e.comuna, e.ciudad].filter(Boolean).join(", "), e.fono ? `Fono: ${e.fono}` : ""];
  datos.filter(Boolean).forEach((l, i) => texto(p, l as string, 28, 84 + i * 12, r.normal, 8));
  caja(p, 381, 64, 202, 82, ROJO);
  const centro = (s: string, arriba: number, size: number) =>
    texto(p, s, 482 - r.negrita.widthOfTextAtSize(limpio(s), size) / 2, arriba, r.negrita, size, ROJO);
  centro(`R.U.T.: ${e.rut}`, 76, 11);
  const nombre = NOMBRE_DTE[d.tipoDte] ?? `DTE ${d.tipoDte}`;
  const partes = renglones(nombre, 22);
  partes.forEach((l, i) => centro(l, 92 + i * 13, 11));
  centro(`N° ${d.folio}`, 92 + partes.length * 13 + 4, 12);
  if (d.oficinaSii) centro(`S.I.I. - ${d.oficinaSii}`, 128, 8);
  texto(p, `Fecha de emisión: ${fechaLarga(d.fechaEmision)}`, 28, 156, r.normal, 9);
}

function receptor(p: PDFPage, d: PdfDteInput, r: Recursos) {
  const c = d.receptor;
  caja(p, 30, 179, 552, 64);
  const fila = (et: string, v: string | undefined, x: number, arriba: number, xv: number) => {
    texto(p, et, x, arriba, r.negrita, 8);
    texto(p, v ?? "", xv, arriba, r.normal, 8);
  };
  fila("SEÑOR(ES):", c.razon, 38, 186, 100);
  fila("GIRO:", c.giro, 38, 200, 114);
  fila("R.U.T.:", c.rut, 38, 214, 114);
  fila("DIRECCIÓN:", c.direccion, 314, 214, 390);
  fila("COMUNA:", c.comuna, 38, 228, 114);
  fila("CIUDAD:", c.ciudad, 314, 228, 390);
}

function referencias(p: PDFPage, d: PdfDteInput, r: Recursos) {
  caja(p, 30, 253, 552, 42);
  texto(p, "REFERENCIAS:", 38, 258, r.negrita, 8);
  (d.referencias ?? []).slice(0, 2).forEach((ref, i) => {
    const doc = `${NOMBRE_REF[ref.tipoDteRef] ?? `Documento ${ref.tipoDteRef}`} N° ${ref.folioRef}`;
    const fecha = ref.fechaRef ? ` del ${fechaCorta(ref.fechaRef)}` : "";
    const motivo = d.tipoDte === 61 || d.tipoDte === 56 ? (CODIGO_REF[ref.codigoRef] ?? "") : "";
    const propia = (ref.razonRef ?? "").toLowerCase();
    const repetida = propia === motivo.toLowerCase() || propia === (NOMBRE_REF[ref.tipoDteRef] ?? "").toLowerCase();
    const razon = ref.razonRef && !repetida ? ` · ${ref.razonRef}` : "";
    const cod = motivo ? ` · ${motivo}` : "";
    texto(p, `${doc}${fecha}${cod}${razon}`.slice(0, 120), 38, 270 + i * 11, r.normal, 8);
  });
}

function detalle(p: PDFPage, d: PdfDteInput, r: Recursos) {
  p.drawRectangle({ x: 30, y: y(319), width: 552, height: 16, color: FONDO });
  texto(p, "Item", 34, 307, r.negrita, 8);
  texto(p, "Descripción", 58, 307, r.negrita, 8);
  alDerecha(p, "Cantidad", 416, 307, r.negrita);
  alDerecha(p, "Precio", 480, 307, r.negrita);
  alDerecha(p, "Monto", 578, 307, r.negrita);
  let arriba = 325;
  d.lineas.slice(0, 22).forEach((l, i) => {
    texto(p, String(i + 1), 34, arriba, r.normal, 8);
    renglones(l.descripcion, 62).slice(0, 2).forEach((t, k) => texto(p, t, 58, arriba + k * 10, r.normal, 8));
    if (l.cantidad !== undefined) alDerecha(p, l.cantidad, 416, arriba, r.normal);
    if (l.precio !== undefined) alDerecha(p, pesos(l.precio), 480, arriba, r.normal);
    alDerecha(p, pesos(l.monto), 578, arriba, r.normal);
    arriba += 22;
  });
  p.drawLine({ start: { x: 30, y: y(arriba) }, end: { x: 582, y: y(arriba) }, thickness: 0.6, color: GRIS });
  const glosaRepetida = d.lineas.some((l) => limpio(l.descripcion) === limpio(d.glosa));
  if (d.glosa && !glosaRepetida) renglones(d.glosa, 110).slice(0, 3).forEach((t, k) => texto(p, t, 30, arriba + 6 + k * 10, r.normal, 8));
}

function totales(p: PDFPage, d: PdfDteInput, r: Recursos) {
  caja(p, 382, 560, 194, 64);
  const fila = (et: string, v: number, arriba: number, f: PDFFont) => {
    texto(p, et, 390, arriba, f, 9);
    alDerecha(p, `$ ${pesos(v)}`, 570, arriba, f, 9);
  };
  fila("NETO", d.neto, 567, r.normal);
  fila("EXENTO", d.exento, 579, r.normal);
  fila("IVA (19%)", d.iva, 591, r.normal);
  fila("TOTAL", d.total, 607, r.negrita);
}

function pie(p: PDFPage, d: PdfDteInput, r: Recursos) {
  p.drawImage(r.timbre, { x: 28, y: y(738), width: 200, height: 76 });
  texto(p, "Timbre Electrónico SII", 30, 744, r.normal, 8);
  const res = d.resolucion ? `Res. N° ${d.resolucion.numero} de ${fechaLarga(d.resolucion.fecha)}` : "Resolución: sin datos";
  texto(p, `${res} - Verifique Documento: www.sii.cl`, 30, 755, r.normal, 8);
}

function cedible(p: PDFPage, r: Recursos) {
  const legal =
    "El acuse de recibo que se declara en este acto, de acuerdo a lo dispuesto en la letra b) del Art. 4°, y la letra c) del Art. 5° de la Ley 19.983, acredita que la entrega de mercaderías o servicio(s) prestado(s) ha(n) sido recibido(s).";
  renglones(legal, 120).forEach((t, i) => texto(p, t, 30, 633 + i * 10, r.normal, 8));
  caja(p, 342, 668, 240, 84);
  ["NOMBRE:", "RUT:", "FECHA:", "RECINTO:", "FIRMA:"].forEach((et, i) => {
    texto(p, et, 350, 676 + i * 15, r.negrita, 8);
    p.drawLine({ start: { x: 402, y: y(685 + i * 15) }, end: { x: 574, y: y(685 + i * 15) }, thickness: 0.4, color: GRIS });
  });
  const c = "CEDIBLE";
  texto(p, c, 306 - r.negrita.widthOfTextAtSize(c, 12) / 2, 770, r.negrita, 12, ROJO);
}

export function dibujarPagina(p: PDFPage, d: PdfDteInput, r: Recursos, conCedible: boolean) {
  cabecera(p, d, r);
  receptor(p, d, r);
  referencias(p, d, r);
  detalle(p, d, r);
  totales(p, d, r);
  pie(p, d, r);
  if (conCedible) cedible(p, r);
}
