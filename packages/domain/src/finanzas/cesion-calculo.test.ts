import { describe, expect, it } from "vitest";

import { documentoPorCobrar, puedeCederDocumento, simularCesion } from "./cesion-calculo";

describe("cesión (CAR-140)", () => {
  it("simula anticipo y merma", () => {
    expect(simularCesion(1_000_000, 250)).toMatchObject({ anticipo: 975_000, merma: 25_000 });
  });

  it("P3 · exige aceptada, impaga y sin anulación por NC", () => {
    const base = {
      tipoDte: 33,
      estadoDte: "aceptado",
      cesionEstado: "no_cedido" as const,
      xmlStorageKey: "dte/x.xml",
      estadoCobro: "pendiente",
      montoTotal: 100_000,
      montoCobrado: 0,
      anuladaPorNc: false,
    };
    expect(puedeCederDocumento(base)).toBeNull();
    expect(puedeCederDocumento({ ...base, estadoDte: "enviado" })).toMatch(/aceptada/i);
    expect(puedeCederDocumento({ ...base, montoCobrado: 100_000, estadoCobro: "pagada" })).toMatch(/impaga/i);
    expect(puedeCederDocumento({ ...base, anuladaPorNc: true })).toMatch(/anulada/i);
  });

  it("C5 · una factura cedida no está por cobrar", () => {
    expect(
      documentoPorCobrar({
        estadoCobro: "cedida",
        cesionEstado: "cedido",
        montoTotal: 100_000,
        montoCobrado: 0,
      }),
    ).toBe(false);
  });
});
