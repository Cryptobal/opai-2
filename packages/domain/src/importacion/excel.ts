import ExcelJS from "exceljs";

import { aTabla } from "./csv";
import { ErrorPlanilla, LIMITES_IMPORTACION, type TablaCruda } from "./tipos";

const dosDigitos = (n: number) => String(n).padStart(2, "0");

/** Texto de una celda de Excel: fechas como aaaa-mm-dd, fórmulas por su resultado, texto enriquecido plano. */
function textoDeCelda(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date)
    return `${v.getUTCFullYear()}-${dosDigitos(v.getUTCMonth() + 1)}-${dosDigitos(v.getUTCDate())}`;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object") {
    const o = v as { result?: unknown; text?: unknown; richText?: { text?: unknown }[]; error?: unknown };
    if (Array.isArray(o.richText)) return o.richText.map((r) => (typeof r.text === "string" ? r.text : "")).join("");
    if (o.result !== undefined) return textoDeCelda(o.result);
    if (typeof o.text === "string") return o.text;
  }
  return "";
}

/** Lee la primera hoja de un .xlsx en memoria. La primera fila con datos es el encabezado. */
export async function leerExcel(contenido: Uint8Array): Promise<TablaCruda> {
  if (contenido.byteLength > LIMITES_IMPORTACION.bytes) throw new ErrorPlanilla("El archivo supera el tamaño máximo (2 MB).");
  const libro = new ExcelJS.Workbook();
  try {
    const copia = new ArrayBuffer(contenido.byteLength);
    new Uint8Array(copia).set(contenido);
    await libro.xlsx.load(copia);
  } catch {
    throw new ErrorPlanilla("No se pudo leer el archivo como Excel (.xlsx).");
  }
  const hoja = libro.worksheets[0];
  if (!hoja) throw new ErrorPlanilla("El archivo Excel no tiene hojas.");
  const filas: string[][] = [];
  let conDatos = 0;
  // `includeEmpty` conserva el número de fila original; `Array.from` rellena los huecos de las celdas vacías.
  hoja.eachRow({ includeEmpty: true }, (fila) => {
    const celdas = Array.from((fila.values as unknown[]).slice(1), textoDeCelda);
    // Las filas en blanco se guardan vacías (conservan la numeración) pero no cuentan para el tope: una
    // hoja con muchos blancos no se corta en silencio, y una con demasiados registros se rechaza en `aTabla`.
    if (celdas.some((c) => c.trim() !== "")) conDatos += 1;
    if (conDatos <= LIMITES_IMPORTACION.filasArchivo + 2) filas.push(celdas);
  });
  return aTabla(filas);
}

/** Genera un .xlsx de una hoja (plantilla descargable). */
export async function escribirExcel(hoja: string, columnas: readonly string[], filas: readonly (readonly string[])[]): Promise<Uint8Array> {
  const libro = new ExcelJS.Workbook();
  const h = libro.addWorksheet(hoja.slice(0, 31));
  h.addRow([...columnas]).font = { bold: true };
  for (const f of filas) h.addRow([...f]);
  h.columns.forEach((c) => (c.width = 24));
  return new Uint8Array(await libro.xlsx.writeBuffer());
}
