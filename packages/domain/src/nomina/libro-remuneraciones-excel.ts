import ExcelJS from "exceljs";

import type { FilaLibroRemuneraciones } from "./libro-remuneraciones";

const COLUMNAS: readonly { header: string; key: keyof FilaLibroRemuneraciones; width: number; clp?: boolean }[] = [
  { header: "RUT", key: "rut", width: 14 },
  { header: "Nombre", key: "nombre", width: 32 },
  { header: "Días trabajados", key: "diasTrabajados", width: 16 },
  { header: "Días licencia", key: "diasLicencia", width: 14 },
  { header: "Haberes imponibles (CLP)", key: "haberesImponibles", width: 22, clp: true },
  { header: "Haberes no imponibles (CLP)", key: "haberesNoImponibles", width: 24, clp: true },
  { header: "Descuentos legales (CLP)", key: "descuentosLegales", width: 22, clp: true },
  { header: "Otros descuentos (CLP)", key: "otrosDescuentos", width: 20, clp: true },
  { header: "Líquido (CLP)", key: "liquido", width: 16, clp: true },
];

const FORMULA = /^[=+\-@\t\r]/;
const texto = (v: string) => (FORMULA.test(v) ? `'${v}` : v);

/** Planilla del libro de remuneraciones del período. */
export async function excelLibroRemuneraciones(filas: readonly FilaLibroRemuneraciones[]): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  const hoja = wb.addWorksheet("Libro", { views: [{ state: "frozen", ySplit: 1 }] });
  hoja.columns = COLUMNAS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  hoja.getRow(1).font = { bold: true };
  for (const f of filas) {
    const fila = hoja.addRow({ ...f, nombre: texto(f.nombre), rut: texto(f.rut) });
    COLUMNAS.forEach((c, i) => {
      if (c.clp) fila.getCell(i + 1).numFmt = "#,##0";
    });
  }
  return new Uint8Array(await wb.xlsx.writeBuffer());
}