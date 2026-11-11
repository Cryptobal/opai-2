// Recuadro del receptor, igual que OPAI 1 (CAR-259): SEÑOR(ES) y GIRO a ancho completo; RUT, DIRECCIÓN, COMUNA y CIUDAD en
// dos columnas. Un dato vacío se omite (nunca se rellena con un valor fijo) y el alto del recuadro se ajusta al contenido.
import type { PDFPage } from "pdf-lib";

import { caja, MARGEN, type Recursos, texto, XFIN } from "./pdf-base";
import { ajustarLineas } from "./pdf-medidas";
import { formatoRut } from "./pdf-texto";
import type { PdfParte } from "./pdf-tipos";

const ETIQUETA_W = 62;
const INTERLINEA = 10;
const PAD = 8;
const SIZE = 8;
const ANCHO_CAJA = XFIN - MARGEN;
const ANCHO_COL = ANCHO_CAJA / 2;

type Celda = { etiqueta: string; lineas: string[]; x: number };
type FilaRecuadro = { celdas: Celda[]; alto: number };

export type RecuadroReceptor = { filas: FilaRecuadro[]; alto: number };

/** Mide el recuadro: cuántos renglones ocupa cada dato y cuánto mide en total. */
export function medirReceptor(c: PdfParte, r: Recursos): RecuadroReceptor {
  const dato = (etiqueta: string, valor: string | undefined, x: number, ancho: number, maxLineas: number): Celda | null => {
    const v = valor?.trim();
    return v ? { etiqueta, lineas: ajustarLineas(v.toUpperCase(), r.normal, SIZE, ancho - ETIQUETA_W - PAD, maxLineas), x } : null;
  };
  const completa = [dato("SEÑOR(ES):", c.razon, MARGEN + PAD, ANCHO_CAJA, 2), dato("GIRO:", c.giro, MARGEN + PAD, ANCHO_CAJA, 2)];
  const dosColumnas = [
    { etiqueta: "R.U.T.:", valor: formatoRut(c.rut) },
    { etiqueta: "DIRECCIÓN:", valor: c.direccion },
    { etiqueta: "COMUNA:", valor: c.comuna },
    { etiqueta: "CIUDAD:", valor: c.ciudad },
  ].filter((d) => d.valor?.trim());
  const filas: FilaRecuadro[] = [];
  for (const celda of completa) if (celda) filas.push({ celdas: [celda], alto: celda.lineas.length * INTERLINEA + 4 });
  for (let i = 0; i < dosColumnas.length; i += 2) {
    const celdas = dosColumnas.slice(i, i + 2).map((d, k) => dato(d.etiqueta, d.valor, MARGEN + PAD + k * ANCHO_COL, ANCHO_COL, 2) as Celda);
    filas.push({ celdas, alto: Math.max(...celdas.map((x) => x.lineas.length)) * INTERLINEA + 4 });
  }
  return { filas, alto: filas.reduce((a, f) => a + f.alto, 0) + 8 };
}

export function dibujarReceptor(p: PDFPage, rec: RecuadroReceptor, arriba: number, r: Recursos) {
  caja(p, MARGEN, arriba, ANCHO_CAJA, rec.alto);
  let fila = arriba + 6;
  for (const f of rec.filas) {
    for (const c of f.celdas) {
      texto(p, c.etiqueta, c.x, fila, r.negrita, SIZE);
      c.lineas.forEach((l, k) => texto(p, l, c.x + ETIQUETA_W, fila + k * INTERLINEA, r.normal, SIZE));
    }
    fila += f.alto;
  }
}
