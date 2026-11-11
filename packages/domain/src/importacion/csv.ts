import { ErrorPlanilla, LIMITES_IMPORTACION, type TablaCruda } from "./tipos";

const SEPARADORES = [";", ",", "\t", "|"] as const;

/** Separador más probable: el que más veces aparece fuera de comillas en la primera línea. */
function detectarSeparador(texto: string): string {
  const linea = texto.split(/\r?\n/, 1)[0] ?? "";
  let mejor: string = ",";
  let max = 0;
  for (const s of SEPARADORES) {
    let n = 0;
    let enComillas = false;
    for (const c of linea) {
      if (c === '"') enComillas = !enComillas;
      else if (c === s && !enComillas) n += 1;
    }
    if (n > max) [mejor, max] = [s, n];
  }
  return mejor;
}

/** Parte el texto en registros respetando comillas dobles, comillas escapadas ("") y saltos dentro de una celda. */
function registros(texto: string, sep: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = "";
  let enComillas = false;
  for (let i = 0; i < texto.length; i += 1) {
    const c = texto[i];
    if (enComillas) {
      if (c === '"' && texto[i + 1] === '"') [celda, i] = [celda + '"', i + 1];
      else if (c === '"') enComillas = false;
      else celda += c;
    } else if (c === '"' && celda === "") enComillas = true;
    else if (c === sep) [fila, celda] = [[...fila, celda], ""];
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i += 1;
      filas.push([...fila, celda]);
      [fila, celda] = [[], ""];
    } else celda += c;
  }
  if (celda !== "" || fila.length > 0) filas.push([...fila, celda]);
  return filas;
}

/** Quita filas vacías, recorta celdas y valida los límites comunes a CSV y Excel. */
export function aTabla(crudas: readonly (readonly string[])[]): TablaCruda {
  const limpias = crudas
    .map((f) => f.map((c) => c.replace(/\u00a0/g, " ").trim().slice(0, LIMITES_IMPORTACION.celda)))
    .filter((f) => f.some((c) => c !== ""));
  const [encabezado, ...filas] = limpias;
  if (!encabezado) throw new ErrorPlanilla("La planilla está vacía.");
  const columnas = encabezado.map((c, i) => c || `Columna ${i + 1}`);
  if (columnas.length > LIMITES_IMPORTACION.columnas)
    throw new ErrorPlanilla(`La planilla tiene más de ${LIMITES_IMPORTACION.columnas} columnas.`);
  if (new Set(columnas.map((c) => c.toLowerCase())).size !== columnas.length)
    throw new ErrorPlanilla("Hay columnas con el mismo encabezado. Cada columna necesita un nombre distinto.");
  if (filas.length === 0) throw new ErrorPlanilla("La planilla solo tiene el encabezado: no hay filas que importar.");
  if (filas.length > LIMITES_IMPORTACION.filasArchivo)
    throw new ErrorPlanilla(`La planilla tiene ${filas.length} filas; el máximo es ${LIMITES_IMPORTACION.filasArchivo}.`);
  return { columnas, filas: filas.map((f) => columnas.map((_, i) => f[i] ?? "")) };
}

/** Lee un CSV (separador `;`, `,`, tabulador o `|`, con o sin BOM). La primera fila es el encabezado. */
export function leerCsv(texto: string): TablaCruda {
  if (texto.length > LIMITES_IMPORTACION.bytes) throw new ErrorPlanilla("El archivo supera el tamaño máximo (2 MB).");
  const limpio = texto.replace(/^\ufeff/, "");
  return aTabla(registros(limpio, detectarSeparador(limpio)));
}

const escapar = (v: string, sep: string) => (v.includes(sep) || /["\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Escribe un CSV con `;` y BOM, que Excel en español abre directo con tildes. */
export function escribirCsv(columnas: readonly string[], filas: readonly (readonly string[])[]): string {
  const linea = (f: readonly string[]) => f.map((c) => escapar(c, ";")).join(";");
  return `\ufeff${[linea(columnas), ...filas.map(linea)].join("\r\n")}\r\n`;
}
