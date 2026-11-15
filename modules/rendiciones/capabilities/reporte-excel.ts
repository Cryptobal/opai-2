import ExcelJS from "exceljs";

/** Fila del Excel del reporte (CAR-179): ya con nombres visibles, una por rendición. */
export type FilaExcelReporte = {
  rendicion: string;
  aprobadaEl: string;
  persona: string;
  categoria: string;
  centro: string;
  estado: string;
  montoClp: number;
};

const COLUMNAS: readonly { header: string; key: keyof FilaExcelReporte; width: number }[] = [
  { header: "Rendición", key: "rendicion", width: 12 },
  { header: "Aprobada el", key: "aprobadaEl", width: 14 },
  { header: "Persona", key: "persona", width: 28 },
  { header: "Categoría", key: "categoria", width: 14 },
  { header: "Centro de costo", key: "centro", width: 30 },
  { header: "Estado", key: "estado", width: 10 },
  { header: "Monto (CLP)", key: "montoClp", width: 14 },
];

const FORMULA = /^[=+\-@\t\r]/;
/** Defensa si alguien copia la hoja a CSV: un texto que parte con = + - @ no se lee como fórmula. */
const texto = (v: string) => (FORMULA.test(v) ? `'${v}` : v);

/** Arma el .xlsx en base64: encabezado fijo, montos como número con miles. */
export async function xlsxReporte(filas: readonly FilaExcelReporte[]): Promise<string> {
  const wb = new ExcelJS.Workbook();
  const hoja = wb.addWorksheet("Rendiciones", { views: [{ state: "frozen", ySplit: 1 }] });
  hoja.columns = COLUMNAS.map((c) => ({ ...c }));
  hoja.getRow(1).font = { bold: true };
  for (const f of filas) {
    const fila = hoja.addRow({ ...f, persona: texto(f.persona), centro: texto(f.centro) });
    fila.getCell(7).numFmt = "#,##0";
  }
  return Buffer.from(await wb.xlsx.writeBuffer()).toString("base64");
}
