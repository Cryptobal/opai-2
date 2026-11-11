import { describe, expect, it } from "vitest";

import { montoLineaVenta, totalesVenta } from "./ventas-lineas";

describe("montoLineaVenta", () => {
  it("cantidad × precio sin descuento", () => {
    expect(montoLineaVenta({ cantidad: "2", precioUnitario: 1_500_000, descuentoPct: 0 })).toBe(3_000_000);
  });
  it("aplica el descuento en centésimas de punto", () => {
    expect(montoLineaVenta({ cantidad: "1", precioUnitario: 1_000_000, descuentoPct: 1000 })).toBe(900_000);
    expect(montoLineaVenta({ cantidad: "3", precioUnitario: 1_000, descuentoPct: 1550 })).toBe(2_535);
  });
  it("cantidad decimal y redondeo una sola vez", () => {
    expect(montoLineaVenta({ cantidad: "0,5", precioUnitario: 1_001, descuentoPct: 0 })).toBe(501);
  });
});

describe("totalesVenta", () => {
  it("la afecta suma IVA 19 % al neto", () => {
    expect(totalesVenta(33, [1_000_000, 500_000])).toEqual({ neto: 1_500_000, exento: 0, iva: 285_000, otros: 0, total: 1_785_000 });
  });
  it("la exenta no lleva IVA", () => {
    expect(totalesVenta(34, [100, 200])).toEqual({ neto: 0, exento: 300, iva: 0, otros: 0, total: 300 });
  });
});

describe("montoLineaVenta = montoLineaProgramacion en CLP", () => {
  it("da el mismo monto que el cálculo de la programación", async () => {
    const { montoLineaProgramacion } = await import("./programacion-montos");
    for (const [cantidad, precio, desc] of [["1", 1, 0], ["2,5", 160_000, 0], ["0.3333", 999_999, 1550], ["12", 1_234_567, 9999], ["7", 3, 5000]] as const) {
      expect(montoLineaVenta({ cantidad, precioUnitario: precio, descuentoPct: desc })).toBe(
        montoLineaProgramacion(
          { glosa: "", cantidad, precioUnitarioClp: BigInt(precio), precioUnitarioUf: null, descuentoPct: desc, exento: false },
          null,
        ),
      );
    }
  });
});
