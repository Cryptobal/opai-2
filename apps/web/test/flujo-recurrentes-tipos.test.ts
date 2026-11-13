import { describe, expect, it } from "vitest";

import { cuando, montoEditable, montoEscrito, montoLegible, type Recurrente } from "../app/(erp)/finanzas/flujo/recurrentes/_componentes/tipos";

describe("montos de gastos recurrentes en pantalla", () => {
  it("lee pesos con punto de miles, UF y % con coma decimal, y rechaza lo inválido", () => {
    expect(montoEscrito("clp", "1.200.000")).toBe(1_200_000);
    expect(montoEscrito("clp", "$ 80.000")).toBe(80_000);
    expect(montoEscrito("uf", "12,5")).toBe(125_000);
    expect(montoEscrito("uf", "12.5")).toBe(125_000);
    expect(montoEscrito("pct_ventas", "5")).toBe(50_000);
    expect(montoEscrito("pct_ventas", "101")).toBeNull();
    expect(montoEscrito("clp", "abc")).toBeNull();
    expect(montoEscrito("clp", "0")).toBeNull();
  });
  it("muestra el monto con su unidad y lo devuelve editable", () => {
    expect(montoLegible({ unidad: "uf", monto: 125_000 })).toBe("12,5 UF");
    expect(montoLegible({ unidad: "pct_ventas", monto: 50_000 })).toBe("5 % de las ventas");
    expect(montoEditable({ unidad: "uf", monto: 125_000 })).toBe("12,5");
    expect(montoEscrito("uf", montoEditable({ unidad: "uf", monto: 125_000 }))).toBe(125_000);
  });
  it("describe cuándo se paga", () => {
    const base = { frecuencia: "mensual", diaDelMes: -1, inicio: "2026-01-05" } as Recurrente;
    expect(cuando(base)).toBe("Mensual, el último día");
    expect(cuando({ ...base, diaDelMes: null })).toBe("Mensual, el día 5");
    expect(cuando({ ...base, frecuencia: "semanal" })).toBe("Cada semana");
  });
});
