import { describe, expect, it } from "vitest";

import {
  cafPorVencer,
  cafVencido,
  foliosPorAgotarse,
  foliosRestantes,
  umbralFoliosDesdePct,
  validarMontosVenta,
  ivaDesdeNeto,
} from "./ventas";
import {
  debeAnularDocumentoOriginal,
  existeAnulacionCod1,
  ESTADOS_CESION,
  montoNcAcumuladoMonetario,
  validarEmisionNotaCredito,
} from "./ventas-nc";

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

  it("umbral de folios bajos desde porcentaje del rango", () => {
    expect(umbralFoliosDesdePct(1, 100, 20)).toBe(20);
    expect(foliosPorAgotarse(foliosRestantes(81, 100), umbralFoliosDesdePct(1, 100, 20))).toBe(true);
    expect(foliosPorAgotarse(foliosRestantes(50, 100), umbralFoliosDesdePct(1, 100, 20))).toBe(false);
  });

  it("detecta CAF vencido y por vencer", () => {
    expect(cafVencido("2026-01-01", "2026-02-01")).toBe(true);
    expect(cafPorVencer("2026-01-25", "2026-01-01", 30)).toBe(true);
    expect(cafPorVencer("2026-03-15", "2026-01-01", 30)).toBe(false);
  });

  it("valida nota de crédito CodRef y tope acumulado", () => {
    const previas = [{ montoTotal: 50_000, codigoReferencia: 3 }];
    expect(
      validarEmisionNotaCredito({
        refEstadoDte: "aceptado",
        refMontoTotal: 119_000,
        codigoReferencia: 3,
        monto: 70_000,
        acumuladoMonetario: montoNcAcumuladoMonetario(previas),
        yaAnuloCod1: false,
      }),
    ).toMatch(/pendiente/i);
    expect(
      validarEmisionNotaCredito({
        refEstadoDte: "aceptado",
        refMontoTotal: 119_000,
        codigoReferencia: 1,
        monto: 69_000,
        acumuladoMonetario: montoNcAcumuladoMonetario(previas),
        yaAnuloCod1: false,
      }),
    ).toBeNull();
    expect(existeAnulacionCod1([{ codigoReferencia: 1 }])).toBe(true);
    expect(debeAnularDocumentoOriginal(1, 69_000, 69_000)).toBe(true);
    expect(ESTADOS_CESION).toEqual(["emitido", "cedido", "no_cedido"]);
  });
});
