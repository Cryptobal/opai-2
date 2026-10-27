import { describe, expect, it } from "vitest";

import {
  colacionValida,
  diasPorSemana,
  etiquetaDiasSemana,
  etiquetaHorario,
  horasSemanalesSugeridas,
  intervaloTurno,
  PATRONES_FABRICA,
  patronValido,
  resumenPatron,
} from "./turnos";

const patron = (nombre: string) => {
  const p = PATRONES_FABRICA.find((x) => x.nombre === nombre);
  if (!p) throw new Error(`Falta el patrón ${nombre}`);
  return p;
};

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

describe("catálogo de patrones", () => {
  it("siembra los 6 patrones de fábrica", () => {
    expect(PATRONES_FABRICA.map((p) => p.nombre)).toEqual([
      "4×4",
      "7×7",
      "14×14",
      "5×2",
      "2×5",
      "3×4",
    ]);
  });
  it("días por semana: proporción en cíclicos, conteo en semanales", () => {
    expect(diasPorSemana(patron("4×4"))).toBeCloseTo(3.5);
    expect(diasPorSemana(patron("7×7"))).toBeCloseTo(3.5);
    expect(diasPorSemana(patron("5×2"))).toBe(5);
    expect(diasPorSemana(patron("2×5"))).toBe(2);
  });
  it("resume el patrón de forma legible", () => {
    expect(resumenPatron(patron("4×4"))).toBe("Ciclo de 8 · 4 de trabajo, 4 de descanso");
    expect(resumenPatron(patron("5×2"))).toBe("Semanal · lun–vie");
    expect(resumenPatron(patron("2×5"))).toBe("Semanal · sáb y dom");
  });
  it("etiqueta los días de la semana", () => {
    expect(etiquetaDiasSemana([1, 2, 3, 4, 5])).toBe("lun–vie");
    expect(etiquetaDiasSemana([6, 7])).toBe("sáb y dom");
    expect(etiquetaDiasSemana([1, 3, 5])).toBe("lun, mié, vie");
    expect(etiquetaDiasSemana([])).toBe("");
  });
});

describe("horas semanales sugeridas", () => {
  const tramoDia = { horaInicio: "08:00", horaFin: "20:00" };
  it("4×4 12 h con 60 min de colación dentro → 38,5 h", () => {
    expect(
      horasSemanalesSugeridas({
        patron: patron("4×4"),
        tramos: [tramoDia],
        colacionMin: 60,
        colacionFuera: false,
      }),
    ).toBe(38.5);
  });
  it("5×2 09:00–17:00 con 60 min → 35 h; 2×5 08:00–16:00 con 30 min → 15 h", () => {
    expect(
      horasSemanalesSugeridas({
        patron: patron("5×2"),
        tramos: [{ horaInicio: "09:00", horaFin: "17:00" }],
        colacionMin: 60,
        colacionFuera: false,
      }),
    ).toBe(35);
    expect(
      horasSemanalesSugeridas({
        patron: patron("2×5"),
        tramos: [{ horaInicio: "08:00", horaFin: "16:00" }],
        colacionMin: 30,
        colacionFuera: false,
      }),
    ).toBe(15);
  });
  it("colación fuera de la jornada no se descuenta", () => {
    expect(
      horasSemanalesSugeridas({
        patron: patron("4×4"),
        tramos: [tramoDia],
        colacionMin: 60,
        colacionFuera: true,
      }),
    ).toBe(42);
  });
  it("rotación día/noche promedia los dos tramos", () => {
    expect(
      horasSemanalesSugeridas({
        patron: patron("4×4"),
        tramos: [tramoDia, { horaInicio: "20:00", horaFin: "08:00" }],
        colacionMin: 60,
        colacionFuera: false,
      }),
    ).toBe(38.5);
  });
  it("valida la colación", () => {
    expect(colacionValida(60)).toBe(true);
    expect(colacionValida(-1)).toBe(false);
    expect(colacionValida(500)).toBe(false);
  });
});
