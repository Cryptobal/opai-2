import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { COLUMNAS_NOMINA } from "../domain";
import { xlsxDeNomina } from "./lotes-nomina";

describe("archivo XLSX de la nómina", () => {
  it("hoja «Santander», encabezado en negrita y congelado, y la fila del ejemplo", async () => {
    const fila = ["99998888", "CLP", "12345678901", "CLP", "037", "11.111.111-1", "Pérez Gómez Ana", 45000, "LOTE-2026-0099", "ana.perez.demo@example.com", "", "", ""];
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(await xlsxDeNomina([fila]), "base64") as never);
    const hoja = wb.getWorksheet("Santander");
    expect(hoja).toBeDefined();
    expect(hoja?.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
    expect(hoja?.getRow(1).font?.bold).toBe(true);
    expect((hoja?.getRow(1).values as unknown[]).slice(1)).toEqual([...COLUMNAS_NOMINA]);
    expect(hoja?.getRow(2).getCell(8).value).toBe(45000);
    expect(hoja?.getRow(2).getCell(7).value).toBe("Pérez Gómez Ana");
    expect(hoja?.rowCount).toBe(2);
  });
});
