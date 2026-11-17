import ExcelJS from "exceljs";

import type { FilaF29Retencion } from "./f29-retencion";

const COLUMNAS = [
  { header: "RUT", key: "rut", width: 14 },
  { header: "Nombre", key: "nombre", width: 32 },
  { header: "Retención impuesto único (CLP)", key: "retencionClp", width: 28, clp: true },
] as const;

const FORMULA = /^[=+\-@\t\r]/;
const texto = (v: string) => (FORMULA.test(v) ? `'${v}` : v);

/** Excel de retenciones de impuesto único (F29) del período. */
export async function excelF29Retencion(
  filas: readonly FilaF29Retencion[],
  totalRetencionClp: number,
): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  const hoja = wb.addWorksheet("Retenciones F29", { views: [{ state: "frozen", ySplit: 1 }] });
  hoja.columns = COLUMNAS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  hoja.getRow(1).font = { bold: true };
  for (const f of filas) {
    const fila = hoja.addRow({ ...f, nombre: texto(f.nombre), rut: texto(f.rut) });
    COLUMNAS.forEach((c, i) => {
      if ("clp" in c && c.clp) fila.getCell(i + 1).numFmt = "#,##0";
    });
  }
  if (filas.length > 0) {
    const tot = hoja.addRow({ rut: "", nombre: "Total", retencionClp: totalRetencionClp });
    tot.font = { bold: true };
    tot.getCell(3).numFmt = "#,##0";
  }
  return new Uint8Array(await wb.xlsx.writeBuffer());
}