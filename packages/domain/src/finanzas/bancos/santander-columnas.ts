// Columnas de la cartola Santander de Office Banking (CAR-327). Dos formatos reales:
// - Cartola histórica: MONTO, DESCRIPCIÓN MOVIMIENTO, FECHA, N° DOCUMENTO, SUCURSAL, CARGO/ABONO (sin SALDO).
// - Consulta de movimientos: además SALDO y N° MOVIMIENTO.
// Antes del detalle vienen bloques de saldos y de línea de crédito («MONTO UTILIZADO»), que no son el encabezado.

export type ColumnasCartola = {
  monto: number;
  glosa: number;
  fecha: number;
  ref?: number;
  suc?: number;
  saldo?: number;
  cargoAbono?: number;
};

const norma = (c: unknown) => String(c ?? "").trim().toUpperCase();

/** Columnas si la fila es el encabezado del detalle: exige MONTO, DESCRIPCIÓN… y FECHA en la misma fila. */
export function columnasDeEncabezado(row: readonly unknown[]): ColumnasCartola | null {
  const celdas = row.map(norma);
  const monto = celdas.findIndex((k) => k === "MONTO" || k.startsWith("MONTO "));
  const glosa = celdas.findIndex((k) => k.startsWith("DESCRIP"));
  const fecha = celdas.findIndex((k) => k === "FECHA" || k.startsWith("FECHA "));
  if (monto < 0 || glosa < 0 || fecha < 0) return null;
  const cols: ColumnasCartola = { monto, glosa, fecha };
  celdas.forEach((k, j) => {
    if (k.includes("DOC")) cols.ref = j;
    if (k.includes("SUCURSAL")) cols.suc = j;
    if (k === "SALDO" || k.startsWith("SALDO ")) cols.saldo = j;
    if (k.includes("CARGO") && k.includes("ABONO")) cols.cargoAbono = j;
  });
  return cols;
}

/**
 * Monto con el signo de CARGO/ABONO (C = cargo, negativo; A = abono, positivo). Sin la columna o con un
 * valor desconocido se respeta el signo que trae el monto.
 */
export function montoConSigno(monto: number, cargoAbono: unknown): number {
  const ca = norma(cargoAbono);
  if (ca === "C" || ca.startsWith("CARGO")) return -Math.abs(monto);
  if (ca === "A" || ca.startsWith("ABONO")) return Math.abs(monto);
  return monto;
}
