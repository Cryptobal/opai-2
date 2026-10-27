import { describe, expect, it } from "vitest";
import { montoUsd } from "../app/(erp)/configuracion/agentes/monto";

describe("monto USD en formato chileno", () => {
  it.each([["10,5", 10.5], ["1.000", 1000], ["1.000,25", 1000.25], ["15", 15]])("interpreta %s", (texto, esperado) => {
    expect(montoUsd(texto)).toBe(esperado);
  });
  it.each(["", "0", "1.2.3", "-5", "1,", "100.000,01"])("rechaza %s", (texto) => {
    expect(montoUsd(texto)).toBeNull();
  });
});
