import { describe, expect, it } from "vitest";

import type { TipoCampoPersonalizado } from "./campos-personalizados";
import { mostrarValorCampo, type CampoMostrable } from "./campos-personalizados-mostrar";

const opciones = [
  { valor: "min", etiqueta: "Minería" },
  { valor: "ret", etiqueta: "Retail" },
];
const m = (tipo: TipoCampoPersonalizado, valor: Parameters<typeof mostrarValorCampo>[1], extra: Partial<CampoMostrable> = {}) =>
  mostrarValorCampo({ tipo, formato: null, opciones, ...extra }, valor);

describe("campos personalizados · mostrar", () => {
  it("vacío es null", () => {
    expect(m("texto", null)).toBeNull();
  });
  it("números según formato", () => {
    expect(m("numero", 1234.5)).toBe("1.234,5");
    expect(m("numero", 1500, { formato: "moneda_clp" })).toBe("$\u00a01.500");
    expect(m("numero", 12.5, { formato: "porcentaje" })).toBe("12,5\u00a0%");
    expect(m("numero", 7, { formato: "entero" })).toBe("7");
  });
  it("opciones por su etiqueta", () => {
    expect(m("lista", "ret")).toBe("Retail");
    expect(m("multiple", ["min", "ret"])).toBe("Minería, Retail");
    expect(m("radio", "borrada")).toBe("borrada");
  });
  it("sí/no, fecha, RUT y teléfono chileno", () => {
    expect(m("si_no", false)).toBe("No");
    expect(m("fecha", "2026-11-13")).toBe("13-11-2026");
    expect(m("rut", "11111111-1")).toBe("11.111.111-1");
    expect(m("telefono", "+56987654321")).toBe("+56 9 8765 4321");
    expect(m("telefono", "+14155550100")).toBe("+14155550100");
  });
});
