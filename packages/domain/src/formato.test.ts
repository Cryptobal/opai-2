import { describe, expect, it } from "vitest";

import { formatearRut } from "./rut";
import {
  formatearHora,
  nombreDiaSemana,
  nombreMesCivil,
  formatearClp,
  formatearFecha,
  formatearFechaHora,
  formatearNumero,
  formatearUsd,
  formatearPorcentaje,
  formatearUf,
} from "./formato";

describe("formateador central", () => {
  it("CLP lleva espacio duro, punto de miles y negativos con signo delante", () => {
    expect(formatearClp(1234567)).toBe("$ 1.234.567");
    expect(formatearClp(-12300)).toBe("-$ 12.300");
    expect(formatearClp(0)).toBe("$ 0");
    expect(formatearClp(999)).toBe("$ 999");
  });
  it("UF admite 4 decimales y no inventa ceros", () => {
    expect(formatearUf(125_000)).toBe("UF 12,50");
    expect(formatearUf(123_456)).toBe("UF 12,3456");
    expect(formatearUf(0)).toBe("UF 0,00");
    expect(formatearUf(-5_000)).toBe("-UF 0,50");
    expect(formatearUf(12_345_678_900)).toBe("UF 1.234.567,89");
  });
  it("porcentaje desde entero escalado", () => {
    expect(formatearPorcentaje(190_000)).toBe("19,0 %");
    expect(formatearPorcentaje(125_000, 2)).toBe("12,50 %");
    expect(formatearPorcentaje(0)).toBe("0,0 %");
  });
  it("números y dólares", () => {
    expect(formatearNumero(1234567)).toBe("1.234.567");
    expect(formatearNumero(1234.5, 2)).toBe("1.234,5");
    expect(formatearNumero(1234.5, 2, 2)).toBe("1.234,50");
    expect(formatearUsd(3.456)).toBe("US$ 3,46");
    expect(formatearUsd(0)).toBe("US$ 0,00");
  });
  it("RUT con K", () => {
    expect(formatearRut("10000013k")).toBe("10.000.013-K");
    expect(formatearRut("no es rut")).toBe("no es rut");
  });
  it("fechas en la zona de Santiago", () => {
    expect(formatearFecha("2026-10-31")).toBe("31-10-2026");
    expect(formatearFecha(null)).toBe("—");
    expect(formatearFecha("2026-11-01T02:30:00Z")).toBe("31-10-2026");
    expect(formatearFechaHora("2026-11-03T15:05:00Z")).toBe("03-11-2026 12:05");
  });
});

describe("hora, día y mes (CAR-462)", () => {
  it("hora en la zona del tenant, también cruzando medianoche", () => {
    expect(formatearHora("2026-11-16T23:00:00Z", "America/Santiago")).toBe("20:00");
    expect(formatearHora("2026-11-17T11:05:00Z", "America/Santiago")).toBe("08:05");
  });

  it("día de la semana y mes de una fecha civil, sin correr el día", () => {
    expect(nombreDiaSemana("2026-11-16")).toBe("lunes");
    expect(nombreMesCivil("2026-12-01")).toBe("diciembre");
  });
});
