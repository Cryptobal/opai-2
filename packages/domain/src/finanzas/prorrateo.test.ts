import { describe, expect, it } from "vitest";

import { diferenciaAsignada, prorratearAbono } from "./prorrateo";

describe("prorratearAbono", () => {
  it("cubre las facturas en orden hasta agotar el abono", () => {
    const r = prorratearAbono(1_000, [{ id: "a", pendiente: 600 }, { id: "b", pendiente: 600 }]);
    expect(r).toEqual({ asignaciones: [{ id: "a", monto: 600 }, { id: "b", monto: 400 }], sobrante: 0 });
  });
  it("deja sobrante si las facturas no absorben todo el abono", () => {
    const r = prorratearAbono(1_000, [{ id: "a", pendiente: 300 }]);
    expect(r).toEqual({ asignaciones: [{ id: "a", monto: 300 }], sobrante: 700 });
  });
  it("no asigna a facturas sin saldo ni con montos negativos", () => {
    const r = prorratearAbono(500, [{ id: "a", pendiente: 0 }, { id: "b", pendiente: -10 }, { id: "c", pendiente: 800 }]);
    expect(r.asignaciones.map((a) => a.monto)).toEqual([0, 0, 500]);
    expect(r.sobrante).toBe(0);
  });
  it("un abono de cero o negativo no asigna nada", () => {
    expect(prorratearAbono(-5, [{ id: "a", pendiente: 100 }]).asignaciones[0]?.monto).toBe(0);
  });
});

describe("diferenciaAsignada", () => {
  it("es cero cuando cuadra y positiva cuando falta", () => {
    expect(diferenciaAsignada(1_000, [{ id: "a", monto: 600 }, { id: "b", monto: 400 }])).toBe(0);
    expect(diferenciaAsignada(1_000, [{ id: "a", monto: 600 }])).toBe(400);
  });
});
