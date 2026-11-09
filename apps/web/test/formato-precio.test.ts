import { PLACEHOLDERS_GLOSA } from "@opai/domain";
import { describe, expect, it } from "vitest";

import { MARCADORES_DESCRIPCION } from "@/app/(erp)/finanzas/ventas/programacion/_componentes/descripcion-linea";
import { precioClpTexto, precioTexto, precioUfTexto } from "@/app/(erp)/finanzas/ventas/programacion/_componentes/formato-precio";
import { parseClp, parseUf } from "@/app/(erp)/finanzas/ventas/programacion/_componentes/tipos";

describe("precio de la programación al tipear", () => {
  it("CLP con punto de miles", () => {
    expect(precioClpTexto("1500000")).toBe("1.500.000");
    expect(precioClpTexto("1.500.0000")).toBe("15.000.000");
    expect(precioClpTexto("")).toBe("");
    expect(precioClpTexto("007")).toBe("7");
    expect(parseClp(precioClpTexto("1500000"))).toBe(1_500_000);
  });
  it("UF con coma decimal, hasta 4 decimales", () => {
    expect(precioUfTexto("12,5")).toBe("12,5");
    expect(precioUfTexto("12.5")).toBe("12,5");
    expect(precioUfTexto("12,123456")).toBe("12,1234");
    expect(precioUfTexto(",5")).toBe("0,5");
    expect(precioUfTexto("12a")).toBe("12");
    expect(parseUf(precioUfTexto("12,5"))).toBe(125_000);
  });
  it("elige por moneda", () => {
    expect(precioTexto("CLP", "2000")).toBe("2.000");
    expect(precioTexto("UF", "2000")).toBe("2000");
  });
  it("los marcadores del selector coinciden con los del dominio", () => {
    expect(Object.keys(MARCADORES_DESCRIPCION)).toEqual([...PLACEHOLDERS_GLOSA]);
  });
});
