import { describe, expect, it } from "vitest";

import {
  clp,
  formatearCLP,
  IVA_PCT,
  ivaCLP,
  porcentajeCLP,
  redondearCLP,
  sumarCLP,
  UF_ESCALA,
  ufACLP,
} from "./dinero";

describe("redondearCLP", () => {
  it("redondea mitad hacia arriba en valor absoluto", () => {
    expect(redondearCLP(10.5)).toBe(11);
    expect(redondearCLP(10.49)).toBe(10);
    expect(redondearCLP(-10.5)).toBe(-11);
    expect(redondearCLP(-10.49)).toBe(-10);
  });

  it("devuelve siempre un entero", () => {
    expect(Number.isInteger(redondearCLP(1234.567))).toBe(true);
    expect(redondearCLP(0)).toBe(0);
  });

  it("rechaza valores no finitos", () => {
    expect(() => redondearCLP(Number.NaN)).toThrow(RangeError);
    expect(() => redondearCLP(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe("clp", () => {
  it("acepta enteros y rechaza decimales", () => {
    expect(clp(1_850_000)).toBe(1_850_000);
    expect(() => clp(10.5)).toThrow(RangeError);
  });
});

describe("porcentajes e IVA", () => {
  it("calcula el IVA al 19% y redondea a peso", () => {
    expect(ivaCLP(clp(5_550_000))).toBe(1_054_500);
    expect(ivaCLP(clp(1))).toBe(0);
    expect(ivaCLP(clp(3))).toBe(1); // 0,57 → 1
    expect(IVA_PCT).toBe(190_000);
  });

  it("aplica porcentajes arbitrarios", () => {
    expect(porcentajeCLP(clp(100_000), 125_000)).toBe(12_500); // 12,5%
  });
});

describe("UF", () => {
  it("convierte UF escaladas a CLP redondeando a peso", () => {
    const dosUf = 2 * UF_ESCALA;
    expect(ufACLP(dosUf, 38_123.45)).toBe(76_247); // 76.246,90
  });
});

describe("sumarCLP y formatearCLP", () => {
  it("suma y formatea con punto de miles y sin decimales", () => {
    const total = sumarCLP(clp(5_550_000), ivaCLP(clp(5_550_000)));
    expect(total).toBe(6_604_500);
    expect(formatearCLP(total)).toBe("$ 6.604.500");
    expect(formatearCLP(clp(-12_300))).toBe("-$ 12.300");
    expect(formatearCLP(clp(0))).toBe("$ 0");
  });
});
