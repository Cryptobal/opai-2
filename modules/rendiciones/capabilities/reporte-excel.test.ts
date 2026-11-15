import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { xlsxReporte } from "./reporte-excel";

describe("xlsxReporte", () => {
  it("escribe encabezado y una fila por rendición, y neutraliza fórmulas en textos", async () => {
    const base64 = await xlsxReporte([
      { rendicion: "REN-3", aprobadaEl: "2026-10-31", persona: "=HYPERLINK(x)", categoria: "Compra", centro: "Portería ficticia", estado: "Pagada", montoClp: 25_000 },
    ]);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(base64, "base64") as never);
    const hoja = wb.getWorksheet("Rendiciones");
    expect(hoja?.getRow(1).values).toEqual([undefined, "Rendición", "Aprobada el", "Persona", "Categoría", "Centro de costo", "Estado", "Monto (CLP)"]);
    expect(hoja?.getRow(2).values).toEqual([undefined, "REN-3", "2026-10-31", "'=HYPERLINK(x)", "Compra", "Portería ficticia", "Pagada", 25_000]);
  });
});
