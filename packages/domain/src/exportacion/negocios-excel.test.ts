import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { COLUMNAS_NEGOCIOS, construirExcelNegocios, type FilaExportNegocio } from "./negocios-excel";

// CAR-27 (parte 2): exportar negocios a Excel. Sin dinero en coma flotante y sin fórmulas inyectadas.
const base: FilaExportNegocio = {
  titulo: "Guardias Planta Norte",
  cuenta: "Minera Ejemplo SpA",
  etapa: "Propuesta enviada",
  estado: "abierto",
  responsable: "Ana Pérez",
  probabilidad: 40,
  montoEstimadoMensual: 4_500_000,
  valorMensual: null,
  cierreEstimado: "2026-12-15",
  inicioServicioEstimado: "2027-01-02",
  cotizacionEnviadaEn: "2026-11-03T14:20:00.000Z",
  ganadoEn: null,
  perdidoEn: null,
  motivoPerdida: null,
  competidor: null,
  etiquetas: ["Minería", "Prioridad"],
  creadoEn: "2026-10-20T10:00:00.000Z",
};

async function leer(buf: Uint8Array) {
  const libro = new ExcelJS.Workbook();
  const copia = new ArrayBuffer(buf.byteLength);
  new Uint8Array(copia).set(buf);
  await libro.xlsx.load(copia);
  const hoja = libro.worksheets[0]!;
  return { hoja, libro };
}

describe("construirExcelNegocios", () => {
  it("escribe el encabezado y una fila por negocio, con dinero como número", async () => {
    const { hoja } = await leer(await construirExcelNegocios([base]));
    expect(hoja.getRow(1).values).toEqual([undefined, ...COLUMNAS_NEGOCIOS.map((c) => c.titulo)]);
    const fila = hoja.getRow(2);
    expect(fila.getCell(1).value).toBe("Guardias Planta Norte");
    expect(fila.getCell(2).value).toBe("Minera Ejemplo SpA");
    const iMonto = COLUMNAS_NEGOCIOS.findIndex((c) => c.clave === "montoEstimadoMensual") + 1;
    expect(fila.getCell(iMonto).value).toBe(4_500_000);
    const iEtiq = COLUMNAS_NEGOCIOS.findIndex((c) => c.clave === "etiquetas") + 1;
    expect(fila.getCell(iEtiq).value).toBe("Minería, Prioridad");
  });

  it("deja vacía la celda de lo que no tiene valor", async () => {
    const { hoja } = await leer(await construirExcelNegocios([base]));
    const iValor = COLUMNAS_NEGOCIOS.findIndex((c) => c.clave === "valorMensual") + 1;
    expect(hoja.getRow(2).getCell(iValor).value).toBeNull();
  });

  it("neutraliza textos que Excel leería como fórmula", async () => {
    const hostil: FilaExportNegocio = {
      ...base,
      titulo: '=HYPERLINK("http://malo.example","clic")',
      cuenta: "+cmd|' /C calc'!A0",
      competidor: "@SUM(1+1)",
      motivoPerdida: "-2+3",
    };
    const { hoja } = await leer(await construirExcelNegocios([hostil]));
    const fila = hoja.getRow(2);
    for (const clave of ["titulo", "cuenta", "competidor", "motivoPerdida"] as const) {
      const i = COLUMNAS_NEGOCIOS.findIndex((c) => c.clave === clave) + 1;
      const v = fila.getCell(i).value;
      expect(typeof v).toBe("string");
      expect(String(v).startsWith("'")).toBe(true);
    }
  });

  it("no toca los textos normales que empiezan con letra o número", async () => {
    const { hoja } = await leer(await construirExcelNegocios([{ ...base, titulo: "24x7 Bodega Sur" }]));
    expect(hoja.getRow(2).getCell(1).value).toBe("24x7 Bodega Sur");
  });

  it("sin negocios devuelve solo el encabezado", async () => {
    const { hoja } = await leer(await construirExcelNegocios([]));
    expect(hoja.rowCount).toBe(1);
  });
});
