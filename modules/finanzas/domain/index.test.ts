import { describe, expect, it } from "vitest";

import {
  calcularPlanilla,
  evaluarCierre,
  esLunes,
  lunesDe,
  planificarMovimiento,
  semanasDesde,
  sumarSemanas,
  tonoDeSaldo,
  type CeldaFlujo,
  type FilaFlujo,
} from "./index";

const ING: FilaFlujo = { id: "i", seccion: "ingreso", arrastre: false };
const EGR: FilaFlujo = { id: "e", seccion: "egreso", arrastre: true };
const c = (
  filaId: string,
  semana: string,
  monto: number,
  capa: CeldaFlujo["capa"] = "plan",
): CeldaFlujo => ({ filaId, semana, capa, monto });

describe("semanas", () => {
  it("encuentra el lunes y suma semanas cruzando el año", () => {
    expect(lunesDe("2026-11-01")).toBe("2026-10-26");
    expect(esLunes("2026-10-26")).toBe(true);
    expect(esLunes("2026-10-27")).toBe(false);
    expect(esLunes("2026-02-30")).toBe(false);
    expect(sumarSemanas("2026-12-28", 1)).toBe("2027-01-04");
    expect(semanasDesde("2026-10-26", 3)).toEqual(["2026-10-26", "2026-11-02", "2026-11-09"]);
  });
});

describe("calcularPlanilla", () => {
  const semanas = semanasDesde("2026-10-26", 3);
  it("acumula el saldo y marca peligro y alerta", () => {
    const r = calcularPlanilla({
      saldoInicial: 100,
      umbral: 50,
      semanas,
      filas: [ING, EGR],
      celdas: [
        c("i", semanas[0]!, 30),
        c("e", semanas[0]!, 90),
        c("e", semanas[1]!, 20),
        c("x", semanas[2]!, 999),
      ],
    });
    expect(r.map((s) => s.saldoFinal)).toEqual([40, 20, 20]);
    expect(r.map((s) => s.tono)).toEqual(["alerta", "alerta", "alerta"]);
    expect(r[1]).toMatchObject({ saldoInicial: 40, ingresos: 0, egresos: 20, neto: -20 });
  });
  it("tono: bajo cero es peligro y sobre el umbral no marca", () => {
    expect(tonoDeSaldo(-1, 0)).toBe("peligro");
    expect(tonoDeSaldo(0, 0)).toBeNull();
    expect(tonoDeSaldo(49, 50)).toBe("alerta");
    expect(tonoDeSaldo(50, 50)).toBeNull();
  });
});

describe("planificarMovimiento", () => {
  const [s0, s1, s2, s3] = semanasDesde("2026-10-26", 4) as [string, string, string, string];
  const base = { fila: ING, selladas: new Set<string>() };
  it("mueve celdas plan y respeta el destino plan sumando", () => {
    const r = planificarMovimiento({
      ...base,
      celdas: [c("i", s0, 10), c("i", s1, 5)],
      semanas: [s0],
      por: 1,
    });
    expect(r).toEqual({ ok: true, movimientos: [{ desde: s0, hasta: s1, monto: 10 }] });
  });
  it("con arrastre mueve también las celdas plan posteriores", () => {
    const r = planificarMovimiento({
      fila: EGR,
      selladas: new Set(),
      celdas: [c("e", s0, 1), c("e", s2, 2), c("e", s3, 3)],
      semanas: [s2],
      por: 1,
    });
    expect(r).toMatchObject({ ok: true });
    if (r.ok) expect(r.movimientos.map((m) => m.desde)).toEqual([s2, s3]);
  });
  it("el arrastre deja quietas las celdas posteriores que no son plan", () => {
    const r = planificarMovimiento({
      fila: EGR,
      selladas: new Set(),
      celdas: [c("e", s0, 1), c("e", s2, 2, "comprometido"), c("e", s3, 3)],
      semanas: [s0],
      por: 1,
    });
    if (!r.ok) throw new Error(r.motivo);
    expect(r.movimientos.map((m) => m.desde)).toEqual([s0, s3]);
  });
  it("rechaza lo no planificado, lo sellado, el destino con real y la selección vacía", () => {
    const m = (extra: Partial<Parameters<typeof planificarMovimiento>[0]>) =>
      planificarMovimiento({ ...base, celdas: [c("i", s0, 10)], semanas: [s0], por: 1, ...extra });
    expect(m({ celdas: [c("i", s0, 10, "real")] })).toMatchObject({ ok: false });
    expect(m({ selladas: new Set([s1]) })).toMatchObject({ ok: false });
    expect(m({ selladas: new Set([s0]) })).toMatchObject({ ok: false });
    expect(m({ celdas: [c("i", s0, 10), c("i", s1, 4, "comprometido")] })).toMatchObject({
      ok: false,
    });
    expect(m({ semanas: [s3] })).toMatchObject({ ok: false });
    expect(m({ por: 0 })).toMatchObject({ ok: false });
  });
});

describe("evaluarCierre", () => {
  it("exige motivo solo sobre la tolerancia", () => {
    expect(evaluarCierre(1_000_000, 1_000_900)).toEqual({ diferencia: 900, exigeMotivo: false });
    expect(evaluarCierre(1_000_000, 990_000)).toEqual({ diferencia: -10_000, exigeMotivo: true });
  });
});
