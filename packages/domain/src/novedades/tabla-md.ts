/**
 * Tablas GFM mínimas (CAR-525): `| a | b |` + separador `|---|---|` + filas.
 * Sin HTML; las celdas se formatean después con `trozosNovedad`.
 */

const FILA = /^\|(.*)\|$/;
const SEP_CELDA = /^\s*:?-{3,}:?\s*$/;

export function esFilaTablaMd(linea: string): boolean {
  return FILA.test(linea.trim());
}

export function esSeparadorTablaMd(linea: string): boolean {
  const m = FILA.exec(linea.trim());
  if (!m) return false;
  const celdas = (m[1] ?? "").split("|");
  return celdas.length > 0 && celdas.every((c) => SEP_CELDA.test(c));
}

export function celdasTablaMd(linea: string): string[] {
  const m = FILA.exec(linea.trim());
  if (!m) return [];
  return (m[1] ?? "").split("|").map((c) => c.trim());
}

/** Si en `i` hay encabezado + separador, consume la tabla y devuelve el índice de la última fila. */
export function consumirTablaMd(
  lineas: string[],
  i: number,
): { encabezados: string[]; filas: string[][]; fin: number } | null {
  const cabeza = lineas[i];
  const sep = lineas[i + 1];
  if (!cabeza || !sep || !esFilaTablaMd(cabeza) || !esSeparadorTablaMd(sep)) return null;
  const encabezados = celdasTablaMd(cabeza);
  if (!encabezados.length) return null;
  const filas: string[][] = [];
  let j = i + 2;
  while (j < lineas.length && esFilaTablaMd(lineas[j]!)) {
    const c = celdasTablaMd(lineas[j]!);
    filas.push(
      encabezados.map((_, k) => c[k] ?? ""),
    );
    j += 1;
  }
  return { encabezados, filas, fin: j - 1 };
}
