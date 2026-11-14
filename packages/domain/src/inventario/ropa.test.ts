import { describe, expect, it } from "vitest";

import { existenciaResultante, lineasDeIngreso } from ".";

describe("inventario · ropa (CAR-237)", () => {
  it("R15 y R16: suma por talla normalizada y rechaza tallas ajenas o cantidades no positivas", () => {
    expect(lineasDeIngreso(["S", "M"], [{ talla: "m", cantidad: 2 }, { talla: " M ", cantidad: 3 }])).toEqual({
      ok: true,
      lineas: [{ talla: "M", cantidad: 5 }],
    });
    expect(lineasDeIngreso(["S"], [{ talla: "XL", cantidad: 1 }])).toMatchObject({ ok: false });
    expect(lineasDeIngreso(["S"], [{ talla: "S", cantidad: 0 }])).toMatchObject({ ok: false });
    expect(lineasDeIngreso(["S"], [{ talla: "S", cantidad: 1.5 }])).toMatchObject({ ok: false });
    expect(lineasDeIngreso(["S"], [])).toMatchObject({ ok: false });
  });

  it("R17: nunca bajo cero", () => {
    expect(existenciaResultante(3, -2)).toBe(1);
    expect(existenciaResultante(1, -2)).toBeNull();
  });
});
