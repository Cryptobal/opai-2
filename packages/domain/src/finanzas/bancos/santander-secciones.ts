// Secciones de la cartola Santander de Office Banking (CAR-341). El archivo trae, en orden: datos de la cuenta,
// bloque «Saldos» (SALDO INICIAL … SALDO FINAL), a veces «Línea de crédito», «Detalle movimientos» con el
// encabezado MONTO | DESCRIPCIÓN | FECHA…, y después secciones que NO son movimientos: «Resumen comisiones»
// (repite comisiones del detalle con el monto en decimal) y «Saldos diarios». Solo el detalle se importa.

export type CeldaCartola = string | number | null;

const textoCelda = (c: CeldaCartola | undefined) => String(c ?? "").trim();

/** Celdas con texto de la fila, sin vacías. */
function celdasConTexto(row: readonly CeldaCartola[]): string[] {
  return row.map(textoCelda).filter((t) => t !== "");
}

const DETALLE = /^detalle\s+(de\s+)?movimientos/i;
const FIN_DETALLE = /^(resumen\s+(de\s+)?comisiones|saldos\s+diarios|resumen\b|totales?\b)/i;

/** Índice de la fila «Detalle movimientos», o -1 si el formato no la trae (consulta de movimientos). */
export function indiceTituloDetalle(rows: readonly (readonly CeldaCartola[])[]): number {
  return rows.findIndex((r) => DETALLE.test(celdasConTexto(r)[0] ?? ""));
}

/**
 * La fila abre una sección que ya no es detalle: un título conocido («Resumen comisiones», «Saldos diarios»)
 * o cualquier título de sección (celdas combinadas que repiten el mismo texto sin números).
 */
export function esFinDeDetalle(row: readonly CeldaCartola[]): boolean {
  const celdas = celdasConTexto(row);
  const primera = celdas[0];
  if (!primera) return false;
  if (FIN_DETALLE.test(primera)) return true;
  return celdas.length >= 2 && celdas.every((c) => c === primera) && !/\d/.test(primera);
}

/** Entero de pesos de una celda del bloque de saldos («1.234.567», «-37.203», número). Null si no es entero. */
export function enteroPesos(v: CeldaCartola | undefined): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isInteger(v) ? v : null;
  const t = v.replace(/[−–]/g, "-").replace(/\$/g, "").replace(/\s/g, "").replace(/\./g, "");
  if (!/^-?\d+$/.test(t)) return null;
  return Number(t);
}

export type SaldosCartola = { inicial: number | null; final: number | null };

/** Bloque «Saldos» antes del detalle: la fila con SALDO INICIAL y SALDO FINAL y, debajo, sus valores. */
export function leerSaldosCartola(rows: readonly (readonly CeldaCartola[])[], hasta: number): SaldosCartola {
  for (let i = 0; i < Math.min(hasta, rows.length - 1); i += 1) {
    const etiquetas = (rows[i] ?? []).map((c) => textoCelda(c).toUpperCase());
    const ini = etiquetas.indexOf("SALDO INICIAL");
    const fin = etiquetas.indexOf("SALDO FINAL");
    if (ini < 0 || fin < 0) continue;
    const valores = rows[i + 1] ?? [];
    return { inicial: enteroPesos(valores[ini]), final: enteroPesos(valores[fin]) };
  }
  return { inicial: null, final: null };
}

export type CuadraturaCartola = {
  saldoInicial: number;
  saldoFinal: number;
  sumaDetalle: number;
  /** saldoInicial + sumaDetalle − saldoFinal; 0 cuando cuadra. */
  diferencia: number;
  cuadra: boolean;
};

/** Saldo inicial + suma del detalle = saldo final. Null si la cartola no trae el bloque de saldos. */
export function cuadraturaCartola(saldos: SaldosCartola, montos: readonly number[]): CuadraturaCartola | null {
  if (saldos.inicial == null || saldos.final == null) return null;
  const sumaDetalle = montos.reduce((a, m) => a + m, 0);
  const diferencia = saldos.inicial + sumaDetalle - saldos.final;
  return { saldoInicial: saldos.inicial, saldoFinal: saldos.final, sumaDetalle, diferencia, cuadra: diferencia === 0 };
}
