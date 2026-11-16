import { describe, expect, it } from "vitest";

import { montoSugeridoTurnoExtra, motivoMontoFaltante, motivoNoResolver } from "./turno-extra";

describe("montoSugeridoTurnoExtra", () => {
  const montos = [
    { puestoId: null, montoClp: 35_000 },
    { puestoId: "p2", montoClp: 42_000 },
  ];
  it("usa la excepción del puesto antes que el monto de la instalación", () => {
    expect(montoSugeridoTurnoExtra(montos, "p2")).toBe(42_000);
  });
  it("sin excepción del puesto usa el de la instalación", () => {
    expect(montoSugeridoTurnoExtra(montos, "p1")).toBe(35_000);
  });
  it("sin montos configurados devuelve null", () => {
    expect(montoSugeridoTurnoExtra([], "p1")).toBeNull();
    expect(montoSugeridoTurnoExtra([{ puestoId: "p9", montoClp: 1 }], "p1")).toBeNull();
  });
  it("un monto cero configurado se respeta", () => {
    expect(montoSugeridoTurnoExtra([{ puestoId: null, montoClp: 0 }], "p1")).toBe(0);
  });
});

describe("motivoNoResolver", () => {
  it("permite a otra persona resolver un turno por aprobar", () => {
    expect(motivoNoResolver({ estado: "por_aprobar", registradoPor: "a" }, "b")).toBeNull();
  });
  it("nadie resuelve lo que registró", () => {
    expect(motivoNoResolver({ estado: "por_aprobar", registradoPor: "a" }, "a")).toMatch(/registró/);
  });
  it("no se resuelve dos veces", () => {
    expect(motivoNoResolver({ estado: "aprobado", registradoPor: "a" }, "b")).toMatch(/resuelto/);
    expect(motivoNoResolver({ estado: "rechazado", registradoPor: "a" }, "b")).toMatch(/resuelto/);
  });
});

describe("motivoMontoFaltante", () => {
  it("exige motivo solo si cambia el monto", () => {
    expect(motivoMontoFaltante(30_000, 30_000, null)).toBe(false);
    expect(motivoMontoFaltante(30_000, 35_000, null)).toBe(true);
    expect(motivoMontoFaltante(30_000, 35_000, "  ")).toBe(true);
    expect(motivoMontoFaltante(30_000, 35_000, "Turno de 24 horas")).toBe(false);
  });
});
