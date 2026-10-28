import { describe, expect, it } from "vitest";
import { parsearMonto } from "../app/_components/sueldos/monto";

describe("parsearMonto", () => {
  it.each([
    ["10,5", null],
    ["-500", null],
    ["1.000.000", 1000000],
    ["100.000.000", 100000000],
    ["100.000.001", null],
    ["", null],
    ["1.00", null],
  ])("valida %s", (valor, esperado) => {
    expect(parsearMonto(valor)).toBe(esperado);
  });
});
