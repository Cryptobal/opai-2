import { describe, expect, it } from "vitest";

import { agruparReporte, CLAVE_ADMINISTRACION, diasDelPeriodo, type FilaReporte } from "./reporte";

const fila = (p: Partial<FilaReporte>): FilaReporte => ({
  solicitanteId: "u1",
  tipo: "compra",
  centroCosto: "administracion",
  instalacionId: null,
  estado: "aprobada",
  montoTotal: 1000,
  ...p,
});

describe("agruparReporte", () => {
  it("suma por persona, separa aprobado y pagado y ordena por total", () => {
    const g = agruparReporte(
      [fila({}), fila({ estado: "pagada", montoTotal: 500 }), fila({ solicitanteId: "u2", montoTotal: 9000 })],
      "persona",
    );
    expect(g).toEqual([
      { clave: "u2", cantidad: 1, totalClp: 9000, aprobadoClp: 9000, pagadoClp: 0 },
      { clave: "u1", cantidad: 2, totalClp: 1500, aprobadoClp: 1000, pagadoClp: 500 },
    ]);
  });

  it("agrupa por centro: instalación o Administración", () => {
    const g = agruparReporte(
      [fila({ centroCosto: "instalacion", instalacionId: "i1" }), fila({}), fila({ centroCosto: "instalacion", instalacionId: null })],
      "centro",
    );
    expect(g.map((x) => [x.clave, x.cantidad])).toEqual([[CLAVE_ADMINISTRACION, 2], ["i1", 1]]);
  });

  it("agrupa por categoría (tipo de rendición)", () => {
    const g = agruparReporte([fila({}), fila({ tipo: "kilometraje", montoTotal: 3000 })], "categoria");
    expect(g.map((x) => x.clave)).toEqual(["kilometraje", "compra"]);
  });

  it("junta el resto en «otros» sin perder el total", () => {
    const filas = [1, 2, 3, 4].map((n) => fila({ solicitanteId: `u${n}`, montoTotal: n * 100 }));
    const g = agruparReporte(filas, "persona", 3);
    expect(g.map((x) => x.clave)).toEqual(["u4", "u3", "otros"]);
    expect(g[2]).toMatchObject({ cantidad: 2, totalClp: 300 });
    expect(g.reduce((s, x) => s + x.totalClp, 0)).toBe(1000);
  });

  it("sin filas devuelve vacío", () => {
    expect(agruparReporte([], "persona")).toEqual([]);
  });
});

describe("diasDelPeriodo", () => {
  it("cuenta ambos extremos", () => {
    expect(diasDelPeriodo("2026-11-01", "2026-11-30")).toBe(30);
    expect(diasDelPeriodo("2026-11-01", "2026-11-01")).toBe(1);
    expect(diasDelPeriodo("2026-11-02", "2026-11-01")).toBe(0);
  });
});
