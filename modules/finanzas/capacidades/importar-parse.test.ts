import { describe, expect, it } from "vitest";

import { filaDesdeRegistroCsv, parsearMontoClp } from "./importar-parse";

describe("parsearMontoClp", () => {
  it("acepta enteros y punto de miles", () => {
    expect(parsearMontoClp("1234567")).toEqual({ ok: true, monto: 1_234_567 });
    expect(parsearMontoClp("1.234.567")).toEqual({ ok: true, monto: 1_234_567 });
    expect(parsearMontoClp("0")).toEqual({ ok: true, monto: 0 });
  });

  it("rechaza decimales y formatos ambiguos", () => {
    expect(parsearMontoClp("1234.56").ok).toBe(false);
    expect(parsearMontoClp("1,234").ok).toBe(false);
    expect(parsearMontoClp("12.34").ok).toBe(false);
  });
});

describe("filaDesdeRegistroCsv", () => {
  it("devuelve el monto interpretado", () => {
    const r = filaDesdeRegistroCsv(
      {
        seccion: "egreso",
        etiqueta: "Proveedor",
        semana: "2026-11-02",
        monto: "1.500.000",
      },
      0,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.fila.monto).toBe(1_500_000);
  });

  it("rechaza las filas de ingresos (ADR-073: no hay ajuste manual de ingresos)", () => {
    const r = filaDesdeRegistroCsv(
      { seccion: "ingreso", etiqueta: "Cliente", semana: "2026-11-02", monto: "1.500.000" },
      0,
    );
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.motivo).toContain("Los ingresos no se ajustan a mano");
  });
});
