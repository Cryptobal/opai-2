import { describe, expect, it } from "vitest";

import {
  foliosPorAgotarse,
  foliosRestantes,
  validarMontosVenta,
  ivaDesdeNeto,
} from "./ventas";

describe("finanzas ventas dominio", () => {
  it("calcula IVA 19 %", () => {
    expect(ivaDesdeNeto(1_000_000)).toBe(190_000);
  });

  it("valida factura 33", () => {
    expect(
      validarMontosVenta(33, { neto: 100, exento: 0, iva: 19, otros: 0, total: 119 }),
    ).toBeNull();
  });

  it("rechaza factura exenta con IVA", () => {
    expect(
      validarMontosVenta(34, { neto: 0, exento: 100, iva: 19, otros: 0, total: 119 }),
    ).toMatch(/exenta/);
  });

  it("detecta folios por agotarse", () => {
    expect(foliosPorAgotarse(foliosRestantes(95, 100), 10)).toBe(true);
    expect(foliosPorAgotarse(foliosRestantes(50, 100), 10)).toBe(false);
  });
});
