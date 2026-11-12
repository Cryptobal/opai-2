import ExcelJS from "exceljs";

import { valorCeldaExcel } from "./celda-excel";
import { validarFilasCartola } from "./limites-cartola";

/** Grilla de la primera hoja leída con ExcelJS (lanza si ExcelJS no abre el archivo). */
export async function filasConExcelJs(contenido: Buffer): Promise<(string | number | null)[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(contenido as unknown as Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0]);
  const hoja = workbook.worksheets[0];
  if (!hoja) return [];
  const rows: (string | number | null)[][] = [];
  hoja.eachRow((row) => {
    validarFilasCartola(rows.length + 1);
    const vals = row.values as unknown[];
    rows.push(vals.slice(1).map((c) => valorCeldaExcel(c)));
  });
  return rows;
}
