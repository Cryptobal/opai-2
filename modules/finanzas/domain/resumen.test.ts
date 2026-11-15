import { describe, expect, it } from "vitest";

import { calcularPlanilla, semanasDesde } from "./index";
import { agruparPorMes, atrasarCobros, indicadores, mesDeSemana } from "./resumen";

const filas = [
  { id: "ing", seccion: "ingreso" as const, arrastre: false },
  { id: "egr", seccion: "egreso" as const, arrastre: false },
];
// Una semana pasada (2026-11-02) y 6 desde el lunes 2026-11-09, que es la semana en curso. Egreso fijo 100; cobros de 300 en las semanas 2 y 4.
const semanas = semanasDesde("2026-11-02", 7);
const hoy = "2026-11-09";
const celdas = [
  ...semanas.map((s) => ({ filaId: "egr", semana: s, capa: "plan" as const, monto: 100 })),
  { filaId: "ing", semana: "2026-11-16", capa: "comprometido" as const, monto: 300 },
  { filaId: "ing", semana: "2026-11-30", capa: "comprometido" as const, monto: 300 },
];
const base = calcularPlanilla({ saldoInicial: 250, umbral: 100, semanas, filas, celdas });
const cobros = new Map([["2026-11-16", 300], ["2026-11-30", 300]]);

describe("mesDeSemana", () => {
  it("una semana partida cuenta en el mes de su jueves", () => {
    expect(mesDeSemana("2026-11-30")).toBe("2026-12"); // jueves 3-dic
    expect(mesDeSemana("2026-10-26")).toBe("2026-10"); // jueves 29-oct
  });
});

describe("atrasarCobros", () => {
  it("sin atraso, la serie no cambia", () => {
    expect(atrasarCobros(base, cobros, 0, hoy, 100)).toEqual(base);
  });
  it("corre los cobros futuros N semanas y recalcula los saldos; el pasado no se toca", () => {
    const r = atrasarCobros(base, cobros, 1, hoy, 100);
    expect(r[0]).toEqual(base[0]);
    expect(r.map((s) => s.ingresos)).toEqual([0, 0, 0, 300, 0, 300, 0]);
    expect(r.at(-1)?.saldoFinal).toBe(base.at(-1)?.saldoFinal);
    expect(r.find((s) => s.semana === "2026-11-16")?.saldoFinal).toBe(-50);
    expect(r.find((s) => s.semana === "2026-11-16")?.tono).toBe("peligro");
  });
  it("un cobro que cae fuera del horizonte deja de contar dentro de él", () => {
    const r = atrasarCobros(base, cobros, 3, hoy, 100);
    expect(r.reduce((a, s) => a + s.ingresos, 0)).toBe(300);
  });
});

describe("agruparPorMes", () => {
  it("suma por mes, toma el saldo de la última semana y el peor tono", () => {
    const meses = agruparPorMes(atrasarCobros(base, cobros, 1, hoy, 100));
    expect(meses.map((m) => [m.clave, m.semanas])).toEqual([["2026-11", 4], ["2026-12", 3]]);
    expect(meses[0]).toMatchObject({ ingresos: 300, egresos: 400, neto: -100, saldoInicial: 250, saldoFinal: 150, tono: "peligro" });
  });
});

describe("indicadores", () => {
  it("primer quiebre, primer negativo, mínimo, semanas de caja y fin del horizonte desde la semana en curso", () => {
    const r = indicadores(atrasarCobros(base, cobros, 1, hoy, 100), hoy, 100);
    expect(r.primerQuiebre).toEqual({ semana: "2026-11-09", saldo: 50, faltaParaUmbral: 50 });
    expect(r.primerNegativo).toEqual({ semana: "2026-11-16", saldo: -50 });
    expect(r.minimo).toEqual({ semana: "2026-11-16", saldo: -50 });
    expect(r.semanasDeCaja).toBe(1);
    expect(r.finHorizonte?.semana).toBe("2026-12-14");
  });
  it("sin saldo negativo, las semanas de caja son todo el horizonte", () => {
    const r = indicadores(calcularPlanilla({ saldoInicial: 10_000, umbral: 100, semanas, filas, celdas }), hoy, 100);
    expect(r.primerNegativo).toBeNull();
    expect(r.semanasDeCaja).toBe(6);
  });
});
