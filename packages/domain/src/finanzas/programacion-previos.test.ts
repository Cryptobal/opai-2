import { describe, expect, it } from "vitest";

import { fechaEnvioPrevios } from "./programacion-previos";

describe("fechaEnvioPrevios", () => {
  it("al generar, o sin día, es el mismo día de la generación", () => {
    expect(fechaEnvioPrevios("2026-12-25", "generar", 28)).toBe("2026-12-25");
    expect(fechaEnvioPrevios("2026-12-25", "fecha_acordada", null)).toBe("2026-12-25");
  });
  it("el día acordado posterior a la generación cae en el mismo mes, y el mismo día vale", () => {
    expect(fechaEnvioPrevios("2026-12-25", "fecha_acordada", 28)).toBe("2026-12-28");
    expect(fechaEnvioPrevios("2026-12-25", "fecha_acordada", 25)).toBe("2026-12-25");
  });
  it("si el día acordado ya pasó, es el del mes siguiente (también cruzando el año)", () => {
    expect(fechaEnvioPrevios("2026-11-25", "fecha_acordada", 5)).toBe("2026-12-05");
    expect(fechaEnvioPrevios("2026-12-25", "fecha_acordada", 5)).toBe("2027-01-05");
  });
  it("un día que el mes no tiene cae en su último día", () => {
    expect(fechaEnvioPrevios("2027-02-10", "fecha_acordada", 31)).toBe("2027-02-28");
    expect(fechaEnvioPrevios("2028-02-10", "fecha_acordada", 30)).toBe("2028-02-29");
    expect(fechaEnvioPrevios("2027-01-31", "fecha_acordada", 30)).toBe("2027-02-28");
  });
});
