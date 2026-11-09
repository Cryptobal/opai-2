// Páginas del DTE en A4, con el orden de la factura de OPAI 1.0 (CAR-221). Los bloques de abajo se anclan al borde inferior.
import type { PDFPage } from "pdf-lib";

import {
  alDerecha, ALTO, ANCHO, caja, centrado, linea, MARGEN, NEGRO, ROJO, type Recursos, texto, XFIN,
} from "./pdf-base";
import { dibujarDetalle, type FilaPdf, RESERVA_GLOSA } from "./pdf-detalle";
import { CODIGO_REF, NOMBRE_DTE, NOMBRE_REF, type PdfDteInput, type PdfReferencia } from "./pdf-tipos";
import { fechaCorta, fechaLarga, limpio, pesos, renglones } from "./pdf-texto";

const MAX_REFERENCIAS = 6;
const CAJA_SII = 202;

function cabecera(p: PDFPage, d: PdfDteInput, r: Recursos) {
  const e = d.emisor;
  texto(p, e.razon, MARGEN, 66, r.negrita, 11);
  const datos = [e.giro, e.direccion, [e.comuna, e.ciudad].filter(Boolean).join(", "), e.fono ? `Fono: ${e.fono}` : ""];
  datos.filter(Boolean).forEach((l, i) => texto(p, l as string, MARGEN, 84 + i * 12, r.normal));
  const x = XFIN - CAJA_SII;
  caja(p, x, 64, CAJA_SII, 82, ROJO);
  const centro = (s: string, arriba: number, size: number) => centrado(p, s, x + CAJA_SII / 2, arriba, r.negrita, size, ROJO);
  centro(`R.U.T.: ${e.rut}`, 76, 11);
  const partes = renglones(NOMBRE_DTE[d.tipoDte] ?? `DTE ${d.tipoDte}`, 22);
  partes.forEach((l, i) => centro(l, 92 + i * 13, 11));
  centro(`N° ${d.folio}`, 92 + partes.length * 13 + 4, 12);
  if (d.oficinaSii) centro(`S.I.I. - ${d.oficinaSii}`, 128, 8);
  texto(p, `Fecha de emisión: ${fechaLarga(d.fechaEmision)}`, MARGEN, 156, r.normal, 9);
}

function receptor(p: PDFPage, d: PdfDteInput, r: Recursos) {
  const c = d.receptor;
  caja(p, MARGEN, 179, XFIN - MARGEN, 64);
  const fila = (et: string, v: string | undefined, x: number, arriba: number, xv: number) => {
    texto(p, et, x, arriba, r.negrita);
    texto(p, v ?? "", xv, arriba, r.normal);
  };
  fila("SEÑOR(ES):", c.razon, 38, 186, 100);
  fila("GIRO:", c.giro, 38, 200, 114);
  fila("R.U.T.:", c.rut, 38, 214, 114);
  fila("DIRECCIÓN:", c.direccion, 300, 214, 372);
  fila("COMUNA:", c.comuna, 38, 228, 114);
  fila("CIUDAD:", c.ciudad, 300, 228, 372);
}

const textoReferencia = (d: PdfDteInput, ref: PdfReferencia) => {
  const doc = `${NOMBRE_REF[ref.tipoDteRef] ?? `Documento ${ref.tipoDteRef}`} N° ${ref.folioRef}`;
  const fecha = ref.fechaRef ? ` del ${fechaCorta(ref.fechaRef)}` : "";
  const motivo = d.tipoDte === 61 || d.tipoDte === 56 ? (CODIGO_REF[ref.codigoRef] ?? "") : "";
  const propia = (ref.razonRef ?? "").toLowerCase();
  const repetida = propia === motivo.toLowerCase() || propia === (NOMBRE_REF[ref.tipoDteRef] ?? "").toLowerCase();
  return `${doc}${fecha}${motivo ? ` · ${motivo}` : ""}${ref.razonRef && !repetida ? ` · ${ref.razonRef}` : ""}`.slice(0, 120);
};

/** Alto del recuadro de referencias: crece con la cantidad (hasta 6; el resto se resume). */
export const altoReferencias = (d: PdfDteInput) => 18 + Math.max(1, Math.min(d.referencias?.length ?? 0, MAX_REFERENCIAS + 1)) * 11;

function referencias(p: PDFPage, d: PdfDteInput, r: Recursos) {
  const refs = d.referencias ?? [];
  caja(p, MARGEN, 253, XFIN - MARGEN, altoReferencias(d));
  texto(p, "REFERENCIAS:", 38, 258, r.negrita);
  refs.slice(0, MAX_REFERENCIAS).forEach((ref, i) => texto(p, textoReferencia(d, ref), 38, 270 + i * 11, r.normal));
  if (refs.length > MAX_REFERENCIAS) texto(p, `y ${refs.length - MAX_REFERENCIAS} referencias más (ver XML)`, 38, 270 + MAX_REFERENCIAS * 11, r.normal);
}

function totales(p: PDFPage, d: PdfDteInput, r: Recursos) {
  caja(p, XFIN - 194, ALTO - 232, 194, 64);
  const fila = (et: string, v: number, arriba: number, f: Recursos["normal"]) => {
    texto(p, et, XFIN - 186, arriba, f, 9);
    alDerecha(p, `$ ${pesos(v)}`, XFIN - 10, arriba, f, 9);
  };
  fila("NETO", d.neto, ALTO - 225, r.normal);
  fila("EXENTO", d.exento, ALTO - 213, r.normal);
  fila("IVA (19%)", d.iva, ALTO - 201, r.normal);
  fila("TOTAL", d.total, ALTO - 185, r.negrita);
}

function pie(p: PDFPage, d: PdfDteInput, r: Recursos) {
  if (r.timbre) p.drawImage(r.timbre, { x: 28, y: 54, width: 200, height: 76 });
  texto(p, "Timbre Electrónico SII", MARGEN, ALTO - 48, r.normal);
  const res = d.resolucion ? `Res. N° ${d.resolucion.numero} de ${fechaLarga(d.resolucion.fecha)}` : "Resolución: sin datos";
  texto(p, `${res} - Verifique Documento: www.sii.cl`, MARGEN, ALTO - 37, r.normal);
}

function cedible(p: PDFPage, r: Recursos) {
  const legal =
    "El acuse de recibo que se declara en este acto, de acuerdo a lo dispuesto en la letra b) del Art. 4°, y la letra c) del Art. 5° de la Ley 19.983, acredita que la entrega de mercaderías o servicio(s) prestado(s) ha(n) sido recibido(s).";
  renglones(legal, 120).forEach((t, i) => texto(p, t, MARGEN, ALTO - 159 + i * 10, r.normal));
  const x = XFIN - 240;
  caja(p, x, ALTO - 124, 240, 84);
  ["NOMBRE:", "RUT:", "FECHA:", "RECINTO:", "FIRMA:"].forEach((et, i) => {
    texto(p, et, x + 8, ALTO - 116 + i * 15, r.negrita);
    linea(p, x + 60, x + 232, ALTO - 107 + i * 15, 0.4);
  });
  centrado(p, "CEDIBLE", ANCHO / 2, ALTO - 22, r.negrita, 12, ROJO);
}

export type OpcionesPagina = { numero: number; total: number; filas: FilaPdf[]; conCedible: boolean };

/** Encabezado simple de las páginas de continuación. */
export function cabeceraContinuacion(p: PDFPage, titulo: string, r: Recursos) {
  texto(p, limpio(titulo), MARGEN, 40, r.negrita, 10);
  texto(p, "(continuación del detalle)", MARGEN, 54, r.normal);
}

export function numeroDePagina(p: PDFPage, numero: number, total: number, r: Recursos) {
  if (total > 1) alDerecha(p, `Página ${numero} de ${total}`, XFIN, 30, r.normal);
}

/** Dibuja una página del DTE: la primera lleva el encabezado completo; la última, los totales, el timbre y el acuse. */
export function dibujarPagina(p: PDFPage, d: PdfDteInput, r: Recursos, o: OpcionesPagina) {
  const primera = o.numero === 1;
  const ultima = o.numero === o.total;
  if (primera) {
    cabecera(p, d, r);
    receptor(p, d, r);
    referencias(p, d, r);
  } else cabeceraContinuacion(p, `${NOMBRE_DTE[d.tipoDte] ?? `DTE ${d.tipoDte}`} N° ${d.folio}`, r);
  numeroDePagina(p, o.numero, o.total, r);
  const cabTop = primera ? 253 + altoReferencias(d) + 8 : 70;
  const fin = dibujarDetalle(p, r, o.filas, cabTop);
  if (!ultima) return;
  const glosaRepetida = d.lineas.some((l) => limpio(l.descripcion) === limpio(d.glosa));
  if (d.glosa && !glosaRepetida) {
    renglones(d.glosa, 110).slice(0, RESERVA_GLOSA / 10).forEach((t, k) => texto(p, t, MARGEN, fin + 6 + k * 10, r.normal, 8, NEGRO));
  }
  totales(p, d, r);
  pie(p, d, r);
  if (o.conCedible) cedible(p, r);
}
