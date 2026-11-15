import { filasConExcelJs } from "./excel-filas";
import { fechaDesdeDdMmAaaa } from "./fechas";
import { ErrorCartola, validarFilasCartola, validarTamanoCartola } from "./limites-cartola";
import { columnasDeEncabezado, type ColumnasCartola } from "./santander-columnas";
import { filaDetalleSantander, type FilaCartolaParseada } from "./santander-fila";
import {
  cuadraturaCartola,
  esFinDeDetalle,
  indiceTituloDetalle,
  leerSaldosCartola,
  type CeldaCartola,
  type CuadraturaCartola,
} from "./santander-secciones";
import { leerXlsxTolerante } from "./xlsx-tolerante";

export type { FilaCartolaParseada } from "./santander-fila";

export type ResultadoCartola = {
  fechaDesde: string | null;
  fechaHasta: string | null;
  saldoFinal: number | null;
  filas: FilaCartolaParseada[];
  rechazadas: { indice: number; motivo: string }[];
  /** Saldo inicial + detalle = saldo final (CAR-341); null si la cartola no trae el bloque de saldos. */
  cuadratura: CuadraturaCartola | null;
};

/**
 * Parser cartola Santander XLSX (columnas MONTO, DESCRIPCIÓN, FECHA, N° DOC, SUCURSAL). Carga en memoria (sin temporales).
 * Primero intenta con ExcelJS; las exportaciones de Santander que ExcelJS no abre (relaciones absolutas, hoja
 * `sheet.xml`, prefijo `x:`) se leen con el lector tolerante (CAR-284).
 */
export async function parsearCartolaSantander(contenido: Buffer): Promise<ResultadoCartola> {
  validarTamanoCartola(contenido.byteLength);
  let rows: CeldaCartola[][];
  try {
    rows = await filasConExcelJs(contenido);
  } catch (e) {
    if (e instanceof ErrorCartola) throw e;
    try {
      rows = await leerXlsxTolerante(contenido);
    } catch {
      throw new ErrorCartola("No se pudo leer el archivo como cartola Santander (.xlsx). Descárgala de nuevo desde Office Banking.");
    }
  }
  validarFilasCartola(rows.length);
  return parsearFilasSantander(rows);
}

/**
 * Lee solo el bloque «Detalle movimientos» (CAR-341): el encabezado se busca desde el título del detalle (o
 * desde el inicio si el formato no lo trae) y la lectura se corta en la sección siguiente («Resumen comisiones»,
 * «Saldos diarios» u otro título). Antes del detalle se toman el período y el bloque de saldos.
 */
export function parsearFilasSantander(rows: CeldaCartola[][]): ResultadoCartola {
  validarFilasCartola(rows.length);
  const titulo = indiceTituloDetalle(rows);
  let fechaDesde: string | null = null;
  let fechaHasta: string | null = null;
  for (const row of titulo >= 0 ? rows.slice(0, titulo) : rows) {
    const texto = row.map((c) => String(c ?? "")).join(" ");
    if (!/fecha\s+desde/i.test(texto)) continue;
    fechaDesde = extraerFechaEnLinea(texto, "desde") ?? fechaDesde;
    fechaHasta = extraerFechaEnLinea(texto, "hasta") ?? fechaHasta;
  }

  let cols: ColumnasCartola | null = null;
  let inicioDetalle = rows.length;
  const filas: FilaCartolaParseada[] = [];
  const rechazadas: { indice: number; motivo: string }[] = [];
  for (let i = Math.max(titulo, 0); i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    if (!cols) {
      cols = columnasDeEncabezado(row);
      if (cols) inicioDetalle = i;
      continue;
    }
    if (esFinDeDetalle(row)) break;
    if (row.every((c) => c == null || String(c).trim() === "")) continue;
    const r = filaDetalleSantander(row, cols, i);
    if (r.ok) filas.push(r.fila);
    else rechazadas.push({ indice: i, motivo: r.motivo });
  }
  if (!cols && rows.length > 0) {
    throw new ErrorCartola("No encontramos el detalle de movimientos (columnas MONTO, DESCRIPCIÓN y FECHA). Revisa que sea una cartola Santander.");
  }

  const saldos = leerSaldosCartola(rows, inicioDetalle);
  const ultimoSaldo = [...filas].reverse().find((f) => f.saldoDespues != null)?.saldoDespues ?? null;
  return {
    fechaDesde,
    fechaHasta,
    saldoFinal: saldos.final ?? ultimoSaldo,
    filas,
    rechazadas,
    cuadratura: cuadraturaCartola(saldos, filas.map((f) => f.monto)),
  };
}

function extraerFechaEnLinea(texto: string, clave: "desde" | "hasta"): string | null {
  const re = clave === "desde" ? /desde:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i : /hasta:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i;
  const m = texto.match(re);
  return m?.[1] ? fechaDesdeDdMmAaaa(m[1]) : null;
}
