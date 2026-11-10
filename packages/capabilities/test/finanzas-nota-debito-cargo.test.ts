// CAR-234 · Reglas puras de la nota de débito de cargo (sin base).
import { describe, expect, it } from "vitest";

import {
  montosNotaDebitoCargo,
  referenciaFacturaCargo,
  validarFacturaParaCargo,
} from "../src/finanzas/ventas-nd-cargo";

const factura = {
  id: "f",
  cuentaId: "c",
  tipoDte: 33,
  folio: 10,
  estadoDte: "enviado",
  fechaEmision: new Date("2026-11-01T00:00:00Z"),
};

describe("nota de débito de cargo", () => {
  it("solo sobre una factura 33/34 emitida y vigente", () => {
    expect(validarFacturaParaCargo(factura).folio).toBe(10);
    expect(() => validarFacturaParaCargo({ ...factura, tipoDte: 61 })).toThrow(/sobre una factura/);
    expect(() =>
      validarFacturaParaCargo({ ...factura, estadoDte: "borrador", folio: null }),
    ).toThrow(/emitida y vigente/);
    expect(() => validarFacturaParaCargo({ ...factura, estadoDte: "anulado_nc" })).toThrow(
      /emitida y vigente/,
    );
    expect(() => validarFacturaParaCargo(null)).toThrow(/no existe/);
  });
  it("los montos siguen el tipo de la factura y deben ser positivos", () => {
    expect(montosNotaDebitoCargo(33, [10_000])).toEqual({
      neto: 10_000,
      exento: 0,
      iva: 1_900,
      otros: 0,
      total: 11_900,
    });
    expect(montosNotaDebitoCargo(34, [5_000, 1_000])).toEqual({
      neto: 0,
      exento: 6_000,
      iva: 0,
      otros: 0,
      total: 6_000,
    });
    expect(() => montosNotaDebitoCargo(33, [0])).toThrow(/monto positivo/);
  });
  it("referencia CodRef 3 con la fecha de la factura, nunca posterior a la ND", () => {
    const ref = referenciaFacturaCargo(
      { tipoDte: 33, folio: 10, fechaEmision: factura.fechaEmision },
      "x".repeat(120),
      "2026-11-10",
    );
    expect(ref).toMatchObject({ tipoDteRef: 33, folioRef: 10, codigoRef: 3 });
    expect(ref.razonRef).toHaveLength(90);
    expect(() =>
      referenciaFacturaCargo(
        { tipoDte: 33, folio: 10, fechaEmision: factura.fechaEmision },
        "m",
        "2026-10-31",
      ),
    ).toThrow(/anterior a la factura/);
  });
});
