import { describe, expect, it } from "vitest";

import { celdasDerivadasDte } from "./derivadas-dte";

describe("derivadas DTE (CAR-140)", () => {
  it("compromete impagas solo en la semana de emisión, sin arrastre", () => {
    const doc = {
      id: "a",
      tipoDte: 33,
      folio: 10,
      fechaEmision: "2026-11-05",
      fechaVencimiento: "2026-12-01",
      montoTotal: 100_000,
      montoCobrado: 0,
      estadoDte: "aceptado",
      estadoCobro: "pendiente",
      cesionEstado: null,
      glosa: null,
    };
    expect(celdasDerivadasDte([doc], "2026-11-02")).toEqual([
      expect.objectContaining({ monto: 100_000, capa: "comprometido" }),
    ]);
    expect(celdasDerivadasDte([doc], "2026-11-10")).toEqual([]);
  });

  it("incluye borradores en la semana de vencimiento", () => {
    const doc = {
      id: "b",
      tipoDte: 33,
      folio: null,
      fechaEmision: null,
      fechaVencimiento: "2026-11-12",
      montoTotal: 50_000,
      montoCobrado: 0,
      estadoDte: "borrador",
      estadoCobro: "pendiente",
      cesionEstado: null,
      glosa: null,
    };
    expect(celdasDerivadasDte([doc], "2026-11-09")).toHaveLength(1);
  });

  it("C5 · excluye facturas cedidas del comprometido", () => {
    const doc = {
      id: "c",
      tipoDte: 33,
      folio: 11,
      fechaEmision: "2026-11-05",
      fechaVencimiento: null,
      montoTotal: 100_000,
      montoCobrado: 0,
      estadoDte: "aceptado",
      estadoCobro: "cedida",
      cesionEstado: "cedido",
      glosa: null,
    };
    expect(celdasDerivadasDte([doc], "2026-11-02")).toEqual([]);
  });
});
