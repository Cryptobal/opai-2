import { describe, expect, it } from "vitest";

import {
  type DocumentoApertura,
  diferenciasControl,
  proximoFolio,
  saldoPorCobrar,
  sumasControl,
  validarApertura,
} from "./apertura";

const doc = (o: Partial<DocumentoApertura> = {}): DocumentoApertura => ({
  tipoDte: 33,
  folio: 100,
  rutReceptor: "11.111.111-1",
  fechaEmision: "2026-09-01",
  fechaVencimiento: "2026-10-01",
  montoNeto: 100_000,
  montoExento: 0,
  montoIva: 19_000,
  montoTotal: 119_000,
  montoCobrado: 0,
  glosa: null,
  ...o,
});

describe("apertura · saldo por cobrar", () => {
  it("es total menos cobrado y nunca negativo", () => {
    expect(saldoPorCobrar(doc({ montoCobrado: 19_000 }))).toBe(100_000);
    expect(saldoPorCobrar(doc({ montoCobrado: 119_000 }))).toBe(0);
  });
  it("una nota de crédito no genera cuenta por cobrar", () => {
    expect(saldoPorCobrar(doc({ tipoDte: 61 }))).toBe(0);
  });
});

describe("apertura · validación", () => {
  const base = { saldos: [], folios: [] };
  it("acepta un documento válido y rechaza repetidos, tipos ajenos y montos inconsistentes", () => {
    const r = validarApertura({
      ...base,
      documentos: [doc(), doc(), doc({ folio: 101, tipoDte: 52 }), doc({ folio: 102, montoCobrado: 200_000 }), doc({ folio: 103, montoTotal: 10 })],
    });
    expect(r.validas.documentos).toHaveLength(1);
    expect(r.rechazos.map((x) => x.motivo)).toEqual([
      "documento repetido",
      "tipo de DTE 52 no soportado",
      "cobrado mayor que el total",
      "el total no cubre neto, exento e IVA",
    ]);
  });
  it("rechaza cuentas repetidas y saldos no enteros", () => {
    const s = { banco: "Santander", numeroVisible: "123", moneda: "CLP", saldo: 5 };
    const r = validarApertura({ documentos: [], folios: [], saldos: [s, s, { ...s, numeroVisible: "9", saldo: 1.5 }] });
    expect(r.validas.saldos).toHaveLength(1);
    expect(r.rechazos).toHaveLength(2);
  });
});

describe("apertura · folios y sumas", () => {
  it("el próximo folio nunca retrocede", () => {
    expect(proximoFolio(10, 50)).toEqual({ proximo: 51, cambia: true });
    expect(proximoFolio(80, 50)).toEqual({ proximo: 80, cambia: false });
  });
  it("las sumas de control detectan diferencias", () => {
    const e = { saldos: [{ banco: "B", numeroVisible: "1", moneda: "CLP", saldo: 1000 }], documentos: [doc(), doc({ folio: 2, montoCobrado: 119_000 })], folios: [] };
    const s = sumasControl(e);
    expect(s).toEqual({ saldos: 1000, documentos: 2, montoTotal: 238_000, porCobrar: 119_000, folios: 0 });
    expect(diferenciasControl(s, { ...s, porCobrar: 0 })).toEqual(["porCobrar: 1.0=119000 · 2.0=0"]);
  });
});
