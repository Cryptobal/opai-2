import { describe, expect, it } from "vitest";

import { cuadraturaMensual, saldoAlCierre, type MovimientoSaldo } from "./cuadratura";

const ancla = { saldo: 1_000_000, fecha: "2026-03-15" };
const movs: MovimientoSaldo[] = [
  { fecha: "2026-02-10", monto: 200_000 }, // antes del ancla
  { fecha: "2026-03-15", monto: -50_000 }, // el mismo día del ancla: ya está en su saldo
  { fecha: "2026-03-16", monto: -100_000 },
  { fecha: "2026-03-31", monto: 300_000 }, // último día del mes
  { fecha: "2026-04-01", monto: -40_000 }, // primer día del mes siguiente
  { fecha: "2026-04-12", monto: -25_000 }, // domingo
  { fecha: "2026-04-13", monto: -25_000 }, // lunes
  { fecha: "2026-04-20", monto: 70_000 }, // mismo día y mismo monto, dos veces: no son duplicados
  { fecha: "2026-04-20", monto: 70_000 },
];

describe("saldoAlCierre", () => {
  it("en la fecha del ancla es el saldo del ancla (incluye lo movido ese día)", () => {
    expect(saldoAlCierre(ancla, movs, "2026-03-15")).toBe(1_000_000);
  });
  it("hacia adelante suma lo posterior al ancla hasta el corte, inclusive", () => {
    expect(saldoAlCierre(ancla, movs, "2026-03-16")).toBe(900_000);
    expect(saldoAlCierre(ancla, movs, "2026-03-31")).toBe(1_200_000);
    expect(saldoAlCierre(ancla, movs, "2026-04-12")).toBe(1_135_000);
    expect(saldoAlCierre(ancla, movs, "2026-04-13")).toBe(1_110_000);
  });
  it("dos movimientos del mismo día y monto cuentan los dos", () => {
    expect(saldoAlCierre(ancla, movs, "2026-04-30")).toBe(1_250_000);
  });
  it("hacia atrás deshace lo movido entre el corte y el ancla", () => {
    expect(saldoAlCierre(ancla, movs, "2026-03-14")).toBe(1_050_000);
    expect(saldoAlCierre(ancla, movs, "2026-02-09")).toBe(850_000);
  });
});

describe("cuadraturaMensual", () => {
  const meses = cuadraturaMensual(ancla, movs, "2026-02", "2026-05");
  it("entrega un mes por fila, también los meses sin movimientos", () => {
    expect(meses.map((m) => m.mes)).toEqual(["2026-02", "2026-03", "2026-04", "2026-05"]);
    expect(meses[3]).toEqual({ mes: "2026-05", saldoInicial: 1_250_000, abonos: 0, cargos: 0, saldoFinal: 1_250_000, movimientos: 0 });
  });
  it("cada mes cuadra: inicial + abonos − cargos = final, y el final es el inicial del mes siguiente", () => {
    for (const [i, m] of meses.entries()) {
      expect(m.saldoInicial + m.abonos - m.cargos).toBe(m.saldoFinal);
      if (i > 0) expect(m.saldoInicial).toBe(meses[i - 1]?.saldoFinal);
    }
  });
  it("cuadra al peso antes, durante y después del mes del ancla", () => {
    expect(meses[0]).toEqual({ mes: "2026-02", saldoInicial: 850_000, abonos: 200_000, cargos: 0, saldoFinal: 1_050_000, movimientos: 1 });
    expect(meses[1]).toEqual({ mes: "2026-03", saldoInicial: 1_050_000, abonos: 300_000, cargos: 150_000, saldoFinal: 1_200_000, movimientos: 3 });
    expect(meses[2]).toEqual({ mes: "2026-04", saldoInicial: 1_200_000, abonos: 140_000, cargos: 90_000, saldoFinal: 1_250_000, movimientos: 5 });
  });
  it("sin movimientos todos los meses tienen el saldo del ancla", () => {
    expect(cuadraturaMensual(ancla, [], "2026-01", "2026-02").map((m) => m.saldoFinal)).toEqual([1_000_000, 1_000_000]);
  });
  it("rango invertido: sin meses", () => {
    expect(cuadraturaMensual(ancla, movs, "2026-05", "2026-02")).toEqual([]);
  });
});
