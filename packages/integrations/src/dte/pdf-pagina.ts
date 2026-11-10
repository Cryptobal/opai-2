// Páginas del DTE en tamaño Carta con el orden de la factura de OPAI 1 (CAR-221, CAR-259): encabezado, receptor, referencias,
// detalle con descripción, totales pegados al detalle y, abajo, timbre y acuse. Un borrador lleva marca de agua y nada de timbre.
import type { PDFPage } from "pdf-lib";

import { alDerecha, caja, MARGEN, type Recursos, texto, XFIN } from "./pdf-base";
import { ALTO_CAJA_SII, cabecera, TOPE_CABECERA } from "./pdf-cabecera";
import { dibujarDetalle, type FilaPdf } from "./pdf-detalle";
import { dibujarReceptor, medirReceptor } from "./pdf-receptor";
import { acuse, marcaCopia, marcaDeAgua, pie, totales } from "./pdf-totales";
import { CODIGO_REF, NOMBRE_DTE, NOMBRE_REF, type PdfDteInput, type PdfReferencia } from "./pdf-tipos";
import { fechaCorta, fechaLarga, limpio } from "./pdf-texto";

const MAX_REFERENCIAS = 6;
const TOPE_FECHA = TOPE_CABECERA + ALTO_CAJA_SII + 8;
const TOPE_RECEPTOR = TOPE_FECHA + 20;

const textoReferencia = (d: PdfDteInput, ref: PdfReferencia) => {
  const doc = `${NOMBRE_REF[ref.tipoDteRef] ?? `Documento ${ref.tipoDteRef}`} N° ${ref.folioRef}`;
  const fecha = ref.fechaRef ? ` del ${fechaCorta(ref.fechaRef)}` : "";
  const motivo = d.tipoDte === 61 || d.tipoDte === 56 ? (CODIGO_REF[ref.codigoRef] ?? "") : "";
  const propia = (ref.razonRef ?? "").toLowerCase();
  const repetida = propia === motivo.toLowerCase() || propia === (NOMBRE_REF[ref.tipoDteRef] ?? "").toLowerCase();
  return `${doc}${fecha}${motivo ? ` · ${motivo}` : ""}${ref.razonRef && !repetida ? ` · ${ref.razonRef}` : ""}`.slice(0, 120);
};

/** Alto del recuadro de referencias: crece con la cantidad (hasta 6; el resto se resume). */
export const altoReferencias = (d: PdfDteInput) =>
  d.referencias?.length ? 18 + Math.min(d.referencias.length, MAX_REFERENCIAS + 1) * 11 : 0;

function referencias(p: PDFPage, d: PdfDteInput, r: Recursos, arriba: number) {
  const refs = d.referencias ?? [];
  if (refs.length === 0) return;
  caja(p, MARGEN, arriba, XFIN - MARGEN, altoReferencias(d));
  texto(p, "REFERENCIAS:", 38, arriba + 5, r.negrita);
  refs.slice(0, MAX_REFERENCIAS).forEach((ref, i) => texto(p, textoReferencia(d, ref), 38, arriba + 17 + i * 11, r.normal));
  if (refs.length > MAX_REFERENCIAS) texto(p, `y ${refs.length - MAX_REFERENCIAS} referencias más (ver XML)`, 38, arriba + 17 + MAX_REFERENCIAS * 11, r.normal);
}

/** Dónde empieza la tabla del detalle en la primera página: depende del alto del receptor y de las referencias. */
export function geometriaPrimera(d: PdfDteInput, r: Recursos) {
  const receptor = medirReceptor(d.receptor, r);
  const arribaRefs = TOPE_RECEPTOR + receptor.alto + 8;
  const alto = altoReferencias(d);
  return { receptor, arribaRefs, cabTop: arribaRefs + (alto ? alto + 8 : 0) };
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
export function dibujarPagina(p: PDFPage, d: PdfDteInput, r: Recursos, o: OpcionesPagina, geo = geometriaPrimera(d, r)) {
  const primera = o.numero === 1;
  const ultima = o.numero === o.total;
  if (d.borrador) marcaDeAgua(p, r);
  if (primera) {
    cabecera(p, d, r);
    texto(p, `Fecha de emisión: ${fechaLarga(d.fechaEmision)}`, MARGEN, TOPE_FECHA, r.normal, 9);
    dibujarReceptor(p, geo.receptor, TOPE_RECEPTOR, r);
    referencias(p, d, r, geo.arribaRefs);
  } else cabeceraContinuacion(p, `${NOMBRE_DTE[d.tipoDte] ?? `DTE ${d.tipoDte}`} ${d.borrador ? "(borrador)" : `N° ${d.folio}`}`, r);
  numeroDePagina(p, o.numero, o.total, r);
  if (!d.borrador) marcaCopia(p, r, o.conCedible);
  const fin = dibujarDetalle(p, r, o.filas, primera ? geo.cabTop : 70);
  if (!ultima) return;
  totales(p, d, r, fin + 10);
  pie(p, d, r);
  if (o.conCedible) acuse(p, r);
}
