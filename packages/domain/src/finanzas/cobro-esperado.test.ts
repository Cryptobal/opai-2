import { describe, expect, it } from "vitest";

import {
  diasEntreCobro,
  fechaEsperadaDeCobro,
  pendienteDeFactura,
  promedioDiasDePago,
  semanaDeCobroEsperado,
} from "./cobro-esperado";

describe("promedioDiasDePago", () => {
  it("exige 3 facturas pagadas o más", () => {
    expect(promedioDiasDePago([30, 40])).toBeNull();
    expect(promedioDiasDePago([30, 40, 50])).toBe(40);
  });
  it("redondea y no deja que un cobro anticipado reste días", () => {
    expect(promedioDiasDePago([10, 11, 11])).toBe(11);
    expect(promedioDiasDePago([-20, 30, 30])).toBe(20);
  });
});

describe("fechaEsperadaDeCobro", () => {
  const base = { fechaEmision: "2026-10-01", fechaVencimiento: "2026-11-30" };
  it("manda lo fijado a mano", () => {
    expect(fechaEsperadaDeCobro({ ...base, manual: "2026-12-15", promedioDias: 20 })).toEqual({ fecha: "2026-12-15", origen: "manual" });
  });
  it("con promedio del cliente usa emisión + promedio", () => {
    expect(fechaEsperadaDeCobro({ ...base, promedioDias: 20 })).toEqual({ fecha: "2026-10-21", origen: "promedio" });
  });
  it("sin promedio usa el vencimiento, y sin vencimiento la emisión", () => {
    expect(fechaEsperadaDeCobro({ ...base, promedioDias: null })).toEqual({ fecha: "2026-11-30", origen: "vencimiento" });
    expect(fechaEsperadaDeCobro({ fechaEmision: "2026-10-01", fechaVencimiento: null, promedioDias: null })).toEqual({ fecha: "2026-10-01", origen: "emision" });
    expect(fechaEsperadaDeCobro({ fechaEmision: null, fechaVencimiento: null, promedioDias: null })).toBeNull();
  });
});

describe("semanaDeCobroEsperado", () => {
  it("lo vencido pasa a la semana actual y lo futuro queda en su lunes", () => {
    expect(semanaDeCobroEsperado("2026-09-02", "2026-11-02")).toBe("2026-11-02");
    expect(semanaDeCobroEsperado("2026-11-19", "2026-11-02")).toBe("2026-11-16");
  });
});

describe("pendienteDeFactura y diasEntreCobro", () => {
  it("monto − NC parcial − cobrado, sin bajar de 0", () => {
    expect(pendienteDeFactura({ montoTotal: 1000, montoNotasCredito: 200, montoCobrado: 300 })).toBe(500);
    expect(pendienteDeFactura({ montoTotal: 1000, montoNotasCredito: 800, montoCobrado: 500 })).toBe(0);
  });
  it("cuenta días", () => {
    expect(diasEntreCobro("2026-10-01", "2026-10-31")).toBe(30);
  });
});
