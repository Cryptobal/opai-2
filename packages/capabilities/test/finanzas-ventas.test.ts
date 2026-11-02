import { describe, expect, it } from "vitest";

import { validarMontosVenta, ivaDesdeNeto } from "@opai/domain";

import { montosDesdeLineas } from "../src/finanzas/ventas-comun";

describe("Finanzas ventas · montos", () => {
  it("factura 33: líneas suman neto e IVA 19 %", () => {
    const m = montosDesdeLineas(33, [{ monto: 100_000 }, { monto: 50_000 }]);
    expect(m.neto).toBe(150_000);
    expect(m.iva).toBe(ivaDesdeNeto(150_000));
    expect(validarMontosVenta(33, m)).toBeNull();
  });

  it("factura 34: todo exento", () => {
    const m = montosDesdeLineas(34, [{ monto: 80_000 }]);
    expect(m).toMatchObject({ neto: 0, iva: 0, exento: 80_000, total: 80_000 });
    expect(validarMontosVenta(34, m)).toBeNull();
  });

  it("detecta total incoherente", () => {
    expect(
      validarMontosVenta(33, { neto: 100, exento: 0, iva: 19, otros: 0, total: 200 }),
    ).toMatch(/no cuadra/i);
  });
});
