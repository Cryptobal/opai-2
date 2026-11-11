// Detalle del documento: medición de cada línea y reparto en páginas sin recortar ni pisar los totales (CAR-221, CAR-259).
import type { PDFPage } from "pdf-lib";

import { alDerecha, ANCHO, FONDO, GRIS, linea as rayar, MARGEN, type Recursos, texto, TOPE_DETALLE, XFIN, y } from "./pdf-base";
import type { PdfLinea } from "./pdf-tipos";
import { pesos, renglones } from "./pdf-texto";

/** `textos`: nombre de la línea (renglón principal); `sub`: descripción, en gris y más chica, debajo (como en OPAI 1). */
export type FilaPdf = { n: number; linea: PdfLinea; textos: string[]; sub: string[]; alto: number };

const ALTO_MIN = 18;
const INTERLINEA = 10;
const INTERLINEA_SUB = 9;
const MAX_NOMBRE = 3;
const MAX_SUB = 4;
/** Espacio bajo la tabla de la proforma para la glosa del documento (hasta 5 renglones). */
export const RESERVA_GLOSA = 56;

/** «15,5» % para 1550 centésimas; «10» para 1000. */
const descuentoTexto = (c: number) => (c % 100 === 0 ? String(c / 100) : (c / 100).toFixed(2).replace(".", ","));

const recortar = (todos: string[], max: number): string[] => {
  const v = todos.slice(0, max);
  if (todos.length > max && v.length > 0) v[max - 1] = `${v[max - 1]}...`;
  return v;
};

/** La primera línea del texto es el nombre; las siguientes (si el documento las trae) son la descripción. */
export function medirFila(l: PdfLinea, n: number): FilaPdf {
  const [primera = "", ...resto] = l.descripcion.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const dscto = l.descuentoPct ? ` (Dscto. ${descuentoTexto(l.descuentoPct)}%)` : "";
  const textos = recortar(renglones(`${primera}${dscto}`, 66), MAX_NOMBRE);
  const sub = recortar(resto.flatMap((s) => renglones(s, 96)), MAX_SUB);
  const alto = Math.max(ALTO_MIN, textos.length * INTERLINEA + sub.length * INTERLINEA_SUB + 6);
  return { n, linea: l, textos, sub, alto };
}

/**
 * Reparte las filas en páginas: la primera tiene `capPrimera` puntos de alto útil y las demás `capCont`. Si se da
 * `capUltima`, la página final (la primera si es única, o una de continuación) deja libre el resto para totales y timbre:
 * lo que no cabe pasa a otra página.
 */
export function paginar(filas: FilaPdf[], capPrimera: number, capCont: number, capUltima = { primera: Infinity, cont: Infinity }): FilaPdf[][] {
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
  const ocupado = (p: FilaPdf[]) => p.reduce((a, f) => a + f.alto, 0);
  for (;;) {
    const ultima = paginas[paginas.length - 1] as FilaPdf[];
    const cap = paginas.length === 1 ? Math.min(capPrimera, capUltima.primera) : Math.min(capCont, capUltima.cont);
    if (ultima.length <= 1 || ocupado(ultima) <= cap) break;
    paginas.push([ultima.pop() as FilaPdf]);
  }
  return paginas;
}

/** Alto útil para las filas de una página (proforma): desde el encabezado de tabla hasta la zona de totales. */
export const capacidad = (cabTop: number) => TOPE_DETALLE - (cabTop + 22) - RESERVA_GLOSA;

const COL = { cantidad: 420, precio: 492 };

/** Dibuja el encabezado de la tabla y sus filas; devuelve dónde termina (distancia desde arriba). */
export function dibujarDetalle(p: PDFPage, r: Recursos, filas: FilaPdf[], cabTop: number, conUnidades = true): number {
  p.drawRectangle({ x: MARGEN, y: y(cabTop + 16), width: ANCHO - 2 * MARGEN, height: 16, color: FONDO });
  texto(p, "Item", MARGEN + 4, cabTop + 4, r.negrita);
  texto(p, "Detalle", MARGEN + 30, cabTop + 4, r.negrita);
  if (conUnidades) {
    alDerecha(p, "Cantidad", COL.cantidad, cabTop + 4, r.negrita);
    alDerecha(p, "Precio $", COL.precio, cabTop + 4, r.negrita);
  }
  alDerecha(p, "Monto $", XFIN - 4, cabTop + 4, r.negrita);
  let arriba = cabTop + 22;
  filas.forEach((f) => {
    texto(p, String(f.n), MARGEN + 4, arriba, r.normal);
    f.textos.forEach((t, k) => texto(p, t, MARGEN + 30, arriba + k * INTERLINEA, r.normal));
    f.sub.forEach((t, k) => texto(p, t, MARGEN + 30, arriba + f.textos.length * INTERLINEA + k * INTERLINEA_SUB, r.normal, 7, GRIS));
    if (conUnidades && f.linea.cantidad !== undefined) alDerecha(p, f.linea.cantidad, COL.cantidad, arriba, r.normal);
    if (conUnidades && f.linea.precio !== undefined) alDerecha(p, pesos(f.linea.precio), COL.precio, arriba, r.normal);
    alDerecha(p, pesos(f.linea.monto), XFIN - 4, arriba, r.normal);
    arriba += f.alto;
  });
  rayar(p, MARGEN, XFIN, arriba);
  return arriba;
}
