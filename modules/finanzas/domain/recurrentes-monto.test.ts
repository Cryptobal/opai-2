import { describe, expect, it } from "vitest";

import { fechaUf, montoCuota, periodoAnterior, type BaseMonto } from "./recurrentes-monto";

// UF en centavos de CLP: 4.000.000 = $40.000,00.
const ufs = new Map([["2026-11-05", 4_000_000], ["2026-12-05", 4_010_000]]);
const ufUltima = { fecha: "2026-11-30", centavos: 4_005_000 };
const ventas = new Map([["2026-09", 90_000_000], ["2026-10", 100_000_000], ["2026-11", 80_000_000]]);
const base: BaseMonto = {
  ufDelDia: (f) => ufs.get(f) ?? null,
  ufUltima,
  ventasNetas: (p) => ventas.get(p) ?? null,
  ultimoPeriodoConVentas: "2026-10",
  periodoActual: "2026-11",
};

describe("montoCuota", () => {
  it("CLP: el monto tal cual, nunca estimado", () => {
    expect(montoCuota({ unidad: "clp", monto: 250_000 }, "2026-12-05", base)).toEqual({ monto: 250_000, estimado: false, detalle: null });
  });

  it("UF: la UF del día de la cuota, redondeada al peso (10.000 = 1 UF)", () => {
    // 12,5 UF × $40.000 = $500.000.
    expect(montoCuota({ unidad: "uf", monto: 125_000 }, "2026-11-05", base)).toMatchObject({ monto: 500_000, estimado: false });
    // 1,2345 UF × $40.100 = $49.503,45 → $49.503.
    expect(montoCuota({ unidad: "uf", monto: 12_345 }, "2026-12-05", base).monto).toBe(49_503);
  });

  it("UF de una fecha sin valor publicado (futura): usa la última UF y lo marca estimado", () => {
    const r = montoCuota({ unidad: "uf", monto: 10_000 }, "2027-01-05", base);
    expect(r).toMatchObject({ monto: 40_050, estimado: true });
    expect(r.detalle).toContain("2026-11-30");
  });

  it("UF sin ninguna publicada: monto 0 y estimado, nunca inventa", () => {
    const r = montoCuota({ unidad: "uf", monto: 10_000 }, "2027-01-05", { ...base, ufUltima: null });
    expect(r).toMatchObject({ monto: 0, estimado: true });
  });

  it("% de ventas: sobre las ventas netas del mes anterior a la cuota (1.000.000 = 100 %)", () => {
    // 5 % de las ventas de octubre ($100M) para la cuota del 5 de noviembre.
    expect(montoCuota({ unidad: "pct_ventas", monto: 50_000 }, "2026-11-05", base)).toMatchObject({ monto: 5_000_000, estimado: false });
  });

  it("% de ventas cuyo mes anterior es el mes en curso: usa lo emitido hasta hoy y lo marca estimado", () => {
    expect(montoCuota({ unidad: "pct_ventas", monto: 50_000 }, "2026-12-05", base)).toMatchObject({ monto: 4_000_000, estimado: true });
  });

  it("% de ventas de un mes futuro: usa el último mes cerrado con ventas (no el mes en curso) y lo marca estimado", () => {
    const r = montoCuota({ unidad: "pct_ventas", monto: 50_000 }, "2027-02-05", base);
    expect(r).toMatchObject({ monto: 5_000_000, estimado: true });
    expect(r.detalle).toContain("2026-10");
  });

  it("% de ventas de un mes pasado sin documentos: 0 pero estimado (pueden faltar por cargar)", () => {
    const r = montoCuota({ unidad: "pct_ventas", monto: 50_000 }, "2026-09-05", { ...base, ventasNetas: () => null });
    expect(r).toMatchObject({ monto: 0, estimado: true });
  });

  it("% de ventas sin ninguna venta registrada: 0 y estimado", () => {
    const r = montoCuota({ unidad: "pct_ventas", monto: 50_000 }, "2027-02-05", { ...base, ventasNetas: () => null, ultimoPeriodoConVentas: null });
    expect(r).toMatchObject({ monto: 0, estimado: true });
  });

  it("ventas netas negativas (más notas de crédito que facturas) no generan un ingreso: 0", () => {
    const r = montoCuota({ unidad: "pct_ventas", monto: 50_000 }, "2026-11-05", { ...base, ventasNetas: () => -1_000 });
    expect(r.monto).toBe(0);
  });

  it("montos grandes no pierden precisión (cálculo entero)", () => {
    // 100.000 UF × $40.000 = $4.000.000.000.
    expect(montoCuota({ unidad: "uf", monto: 1_000_000_000 }, "2026-11-05", base).monto).toBe(4_000_000_000);
  });
});

describe("fechaUf (paridad con OPAI 1)", () => {
  it("día de la cuota, fin de mes, inicio de mes, fin del mes anterior y día fijo ajustado", () => {
    expect(fechaUf("dia_cuota", null, "2027-02-10")).toBe("2027-02-10");
    expect(fechaUf("fin_de_mes", null, "2027-02-10")).toBe("2027-02-28");
    expect(fechaUf("inicio_de_mes", null, "2027-02-10")).toBe("2027-02-01");
    expect(fechaUf("fin_mes_anterior", null, "2027-01-10")).toBe("2026-12-31");
    expect(fechaUf("dia_fijo", 31, "2027-02-10")).toBe("2027-02-28");
  });
  it("la cuota en UF usa la UF del día que dice la política", () => {
    const r = montoCuota({ unidad: "uf", monto: 10_000, politicaUf: "fin_mes_anterior" }, "2026-12-05", { ...base, ufDelDia: (f) => (f === "2026-11-30" ? 4_020_000 : null) });
    expect(r).toMatchObject({ monto: 40_200, estimado: false, detalle: "UF del 2026-11-30" });
  });
});

describe("periodoAnterior", () => {
  it("mes anterior, cruzando el año", () => {
    expect(periodoAnterior("2026-11-05")).toBe("2026-10");
    expect(periodoAnterior("2027-01-31")).toBe("2026-12");
  });
});
