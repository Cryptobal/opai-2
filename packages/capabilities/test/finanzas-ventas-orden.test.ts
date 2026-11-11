import { describe, expect, it } from "vitest";

import { ordenVentas, ordenVentasSchema } from "../src/finanzas/ventas-orden";

describe("orden del libro de ventas (CAR-270)", () => {
  it("por defecto, más recientes primero; todo orden desempata por id", () => {
    expect(ordenVentasSchema.parse(undefined)).toBe("recientes");
    for (const o of ["recientes", "antiguas", "mayor_monto", "menor_monto", "tipo"] as const) expect(ordenVentas(o).at(-1)).toHaveProperty("id");
    expect(ordenVentas("mayor_monto")[0]).toEqual({ montoTotal: "desc" });
  });
});
