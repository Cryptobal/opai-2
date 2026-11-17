import ExcelJS from "exceljs";

import type { z } from "zod";

import type { cabeceraSchema } from "./esquema";

type Cabecera = z.infer<typeof cabeceraSchema>;
type Col = { clave: string; etiqueta: string };
type Fila = Record<string, string | number | boolean | null>;

export async function xlsxReporteDt(
  titulo: string,
  cabecera: Cabecera,
  columnas: Col[],
  filas: Fila[],
): Promise<string> {
  const wb = new ExcelJS.Workbook();
  const sh = wb.addWorksheet(titulo.slice(0, 31));
  sh.addRow(["Razón social", cabecera.razonSocial]);
  sh.addRow(["RUT empleador", cabecera.rutEmpleador]);
  if (cabecera.trabajador) sh.addRow(["Trabajador", cabecera.trabajador]);
  if (cabecera.rutTrabajador) sh.addRow(["RUT trabajador", cabecera.rutTrabajador]);
  sh.addRow(["Lugar", cabecera.lugar]);
  sh.addRow(["Período", cabecera.periodo]);
  sh.addRow([]);
  sh.addRow(columnas.map((c) => c.etiqueta));
  for (const f of filas) sh.addRow(columnas.map((c) => f[c.clave] ?? ""));
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf).toString("base64");
}