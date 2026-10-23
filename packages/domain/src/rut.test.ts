import { describe, expect, it } from "vitest";

import { digitoVerificador, formatearRut, normalizarRut, rutValido } from "./rut";

describe("RUT", () => {
  it("calcula el dígito verificador (módulo 11), incluidos 0 y K", () => {
    expect(digitoVerificador("12345678")).toBe("5");
    expect(digitoVerificador("11111111")).toBe("1");
    expect(digitoVerificador("10000013")).toBe("K");
    expect(digitoVerificador("10000004")).toBe("0");
  });

  it("normaliza cualquier escritura a la forma canónica", () => {
    for (const e of ["12.345.678-5", "12345678-5", "123456785", " 12 345 678 - 5 "]) {
      expect(normalizarRut(e)).toBe("12345678-5");
    }
    expect(normalizarRut("10.000.013-k")).toBe("10000013-K");
  });

  it("rechaza dígito verificador incorrecto, basura y cuerpos absurdos", () => {
    expect(normalizarRut("12.345.678-9")).toBeNull();
    expect(normalizarRut("hola")).toBeNull();
    expect(normalizarRut("1-9")).toBeNull();
    expect(rutValido("12345678-5")).toBe(true);
  });

  it("formatea con puntos y guion", () => {
    expect(formatearRut("123456785")).toBe("12.345.678-5");
    expect(formatearRut("no es rut")).toBe("no es rut");
  });
});
