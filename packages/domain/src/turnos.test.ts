import { describe, expect, it } from "vitest";

import { etiquetaHorario, intervaloTurno, patronValido } from "./turnos";

describe("turnos", () => {
  it("turno diurno sin cruce", () => {
    expect(intervaloTurno("08:00", "20:00")).toEqual({
      inicioMin: 480,
      finMin: 1200,
      duracionMin: 720,
      cruzaMedianoche: false,
    });
  });
  it("turno nocturno cruza la medianoche", () => {
    const t = intervaloTurno("20:00", "08:00");
    expect(t.cruzaMedianoche).toBe(true);
    expect(t.duracionMin).toBe(720);
    expect(etiquetaHorario("20:00", "08:00")).toBe("20:00–08:00 (+1)");
  });
  it("inicio igual a fin es un turno de 24 horas", () => {
    expect(intervaloTurno("08:00", "08:00").duracionMin).toBe(1440);
  });
  it("valida horas y patrones", () => {
    expect(() => intervaloTurno("25:00", "08:00")).toThrow();
    expect(patronValido(4, 4)).toBe(true);
    expect(patronValido(0, 4)).toBe(false);
    expect(patronValido(5, 2.5)).toBe(false);
  });
});
