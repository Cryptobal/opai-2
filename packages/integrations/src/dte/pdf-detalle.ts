// Detalle del documento: medición de cada línea y reparto en páginas sin recortar ni pisar los totales (CAR-221).
import type { PDFPage } from "pdf-lib";

import { alDerecha, ANCHO, FONDO, linea as rayar, MARGEN, type Recursos, texto, TOPE_DETALLE, XFIN, y } from "./pdf-base";
import type { PdfLinea } from "./pdf-tipos";
import { pesos, renglones } from "./pdf-texto";

export type FilaPdf = { n: number; linea: PdfLinea; textos: string[]; alto: number };

const ALTO_MIN = 22;
const INTERLINEA = 10;
const MAX_RENGLONES = 6;
/** Espacio bajo la tabla para la glosa del documento (hasta 5 renglones). */
export const RESERVA_GLOSA = 56;

export function medirFila(l: PdfLinea, n: number): FilaPdf {
  const todos = renglones(l.descripcion, 62);
  const textos = todos.slice(0, MAX_RENGLONES);
  if (todos.length > MAX_RENGLONES) textos[MAX_RENGLONES - 1] = `${textos[MAX_RENGLONES - 1]}...`;
  return { n, linea: l, textos, alto: Math.max(ALTO_MIN, textos.length * INTERLINEA + 4) };
}

/** Reparte las filas en páginas: la primera tiene `capPrimera` puntos de alto útil y las demás `capCont`. */
export function paginar(filas: FilaPdf[], capPrimera: number, capCont: number): FilaPdf[][] {
  const paginas: FilaPdf[][] = [[]];
  let libre = capPrimera;
  for (const f of filas) {
    const actual = paginas[paginas.length - 1] as FilaPdf[];
    if (f.alto > libre && actual.length > 0) {
      paginas.push([]);
      libre = capCont;
    }
    (paginas[paginas.length - 1] as FilaPdf[]).push(f);
    libre -= f.alto;
  }
  return paginas;
}

/** Alto útil para las filas de una página cuyo encabezado de tabla empieza en `cabTop`. */
export const capacidad = (cabTop: number) => TOPE_DETALLE - (cabTop + 22) - RESERVA_GLOSA;

/** Dibuja el encabezado de la tabla y sus filas; devuelve dónde termina (distancia desde arriba). */
export function dibujarDetalle(p: PDFPage, r: Recursos, filas: FilaPdf[], cabTop: number, conUnidades = true): number {
  p.drawRectangle({ x: MARGEN, y: y(cabTop + 16), width: ANCHO - 2 * MARGEN, height: 16, color: FONDO });
  texto(p, "Item", MARGEN + 4, cabTop + 4, r.negrita);
  texto(p, "Descripción", MARGEN + 28, cabTop + 4, r.negrita);
  if (conUnidades) {
    alDerecha(p, "Cantidad", 400, cabTop + 4, r.negrita);
    alDerecha(p, "Precio", 465, cabTop + 4, r.negrita);
  }
  alDerecha(p, "Monto", XFIN - 4, cabTop + 4, r.negrita);
  let arriba = cabTop + 22;
  filas.forEach((f) => {
    texto(p, String(f.n), MARGEN + 4, arriba, r.normal);
    f.textos.forEach((t, k) => texto(p, t, MARGEN + 28, arriba + k * INTERLINEA, r.normal));
    if (conUnidades && f.linea.cantidad !== undefined) alDerecha(p, f.linea.cantidad, 400, arriba, r.normal);
    if (conUnidades && f.linea.precio !== undefined) alDerecha(p, pesos(f.linea.precio), 465, arriba, r.normal);
    alDerecha(p, pesos(f.linea.monto), XFIN - 4, arriba, r.normal);
    arriba += f.alto;
  });
  rayar(p, MARGEN, XFIN, arriba);
  return arriba;
}
