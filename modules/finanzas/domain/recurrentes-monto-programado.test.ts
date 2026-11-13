import { describe, expect, it } from "vitest";

import { montoCuota, type BaseMonto } from "./recurrentes-monto";

// CAR-374: el % de ventas de meses que aún no cierran se estima con lo ya programado (programaciones sin generar y
// borradores), en vez de copiar el último mes cerrado.
const ventas = new Map([["2026-10", 100_000_000], ["2026-11", 30_000_000]]);
const programado = new Map([["2026-11", 50_000_000], ["2026-12", 120_000_000]]);
const base: BaseMonto = {
  ufDelDia: () => null,
  ufUltima: null,
  ventasNetas: (p) => ventas.get(p) ?? null,
  ultimoPeriodoConVentas: "2026-10",
  periodoActual: "2026-11",
  ventasProgramadas: (p) => programado.get(p) ?? null,
};
const cuota = (fecha: string, b: BaseMonto = base) => montoCuota({ unidad: "pct_ventas", monto: 50_000 }, fecha, b);

describe("montoCuota · % de ventas con lo programado (CAR-374)", () => {
  it("mes en curso: lo emitido hasta hoy más lo programado que falta emitir", () => {
    // 5 % de (30M + 50M) = 4M.
    const r = cuota("2026-12-05");
    expect(r).toMatchObject({ monto: 4_000_000, estimado: true });
    expect(r.detalle).toContain("programado");
  });

  it("mes futuro con programaciones: usa lo programado para ese mes", () => {
    // 5 % de 120M = 6M (no el último mes cerrado, que daría 5M).
    const r = cuota("2027-01-05");
    expect(r).toMatchObject({ monto: 6_000_000, estimado: true });
    expect(r.detalle).toContain("2026-12");
  });

  it("mes futuro sin nada programado: vuelve al último mes cerrado", () => {
    const r = cuota("2027-03-05");
    expect(r).toMatchObject({ monto: 5_000_000, estimado: true });
    expect(r.detalle).toContain("2026-10");
  });

  it("mes cerrado: manda lo emitido, nunca lo programado", () => {
    const r = cuota("2026-11-05", { ...base, ventasProgramadas: () => 999_000_000 });
    expect(r).toMatchObject({ monto: 5_000_000, estimado: false });
  });

  it("sin la función de programado (base antigua): mismo resultado que antes", () => {
    const { ventasProgramadas: _, ...antigua } = base;
    expect(cuota("2027-01-05", antigua)).toMatchObject({ monto: 5_000_000 });
    expect(cuota("2026-12-05", antigua)).toMatchObject({ monto: 1_500_000 });
  });
});
