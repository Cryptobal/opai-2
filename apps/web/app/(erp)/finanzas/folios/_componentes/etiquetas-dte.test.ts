import { describe, expect, it } from "vitest";

import { cafVencido } from "@opai/domain";

import { estadoFolio, foliosUsados, nombreTipoDte } from "./etiquetas-dte";

describe("folios · etiquetas UI", () => {
  it("nombre de tipo DTE", () => {
    expect(nombreTipoDte(33)).toBe("Factura 33");
    expect(nombreTipoDte(99)).toBe("DTE 99");
  });

  it("folios usados desde folio actual", () => {
    expect(foliosUsados({ folioDesde: 100, folioActual: 100 })).toBe(0);
    expect(foliosUsados({ folioDesde: 100, folioActual: 105 })).toBe(5);
  });

  it("estado vigente y vencido", () => {
    const base = { activo: true, restantes: 10, alerta: false, cafVenceEn: "2030-01-01" };
    expect(estadoFolio(base, "2026-01-01").etiqueta).toBe("Vigente");
    expect(
      estadoFolio({ ...base, cafVenceEn: "2020-01-01" }, "2026-01-01").etiqueta,
    ).toBe("CAF vencido");
    expect(cafVencido("2020-01-01", "2026-01-01")).toBe(true);
  });
});
