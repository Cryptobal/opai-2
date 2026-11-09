import { describe, expect, it } from "vitest";

import { estadoDeCierre } from "./cierre";

describe("estadoDeCierre", () => {
  it("todos los obligatorios marcados: completada", () => {
    expect(estadoDeCierre({ obligatorios: 5, marcados: 5, umbralIncompletaPct: 20 })).toBe(
      "completada",
    );
  });
  it("faltantes dentro del umbral: completada; sobre el umbral: incompleta", () => {
    expect(estadoDeCierre({ obligatorios: 5, marcados: 4, umbralIncompletaPct: 20 })).toBe(
      "completada",
    );
    expect(estadoDeCierre({ obligatorios: 5, marcados: 3, umbralIncompletaPct: 20 })).toBe(
      "incompleta",
    );
  });
  it("umbral cero exige todos; sin obligatorios siempre se completa", () => {
    expect(estadoDeCierre({ obligatorios: 4, marcados: 3, umbralIncompletaPct: 0 })).toBe(
      "incompleta",
    );
    expect(estadoDeCierre({ obligatorios: 0, marcados: 0, umbralIncompletaPct: 0 })).toBe(
      "completada",
    );
  });
  it("marcados fuera de rango se acotan", () => {
    expect(estadoDeCierre({ obligatorios: 2, marcados: 9, umbralIncompletaPct: 0 })).toBe(
      "completada",
    );
    expect(estadoDeCierre({ obligatorios: 2, marcados: -1, umbralIncompletaPct: 0 })).toBe(
      "incompleta",
    );
  });
});
