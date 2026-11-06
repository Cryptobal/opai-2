import { describe, expect, it } from "vitest";

import { fechaDePago, impuestosPorPeriodo, pagosDeImpuestos, sumarMeses } from "./iva-ppm";

const v = (fecha: string, monto: number, tipoDte = 33) => ({ fecha, tipoDte, montoNeto: monto, montoExento: 0, montoIva: Math.round(monto * 0.19) });

describe("calendario de pagos", () => {
  it("suma meses cruzando el año y acota el día al fin de mes", () => {
    expect(sumarMeses("2026-11", 1)).toBe("2026-12");
    expect(sumarMeses("2026-12", 1)).toBe("2027-01");
    expect(sumarMeses("2026-11", 2)).toBe("2027-01");
    expect(fechaDePago("2027-02", 30)).toBe("2027-02-28");
    expect(fechaDePago("2026-12", 20)).toBe("2026-12-20");
  });
});

describe("impuestosPorPeriodo", () => {
  it("IVA = débito − crédito (NC resta) y PPM sobre las ventas netas", () => {
    const r = impuestosPorPeriodo({
      ventas: [v("2026-10-05", 1_000_000), v("2026-10-20", 500_000), v("2026-10-25", 100_000, 61)],
      compras: [{ fecha: "2026-10-10", tipoDte: 33, montoNeto: 400_000, montoExento: 0, montoIva: 76_000 }],
      tasaPpmBps: 100,
    });
    expect(r).toEqual([{ periodo: "2026-10", debito: 266_000 - 0, credito: 76_000, iva: 190_000, ppm: 14_000 }]);
  });
  it("la nota de débito (56) suma al débito igual que una factura", () => {
    const r = impuestosPorPeriodo({ ventas: [v("2026-10-05", 1_000_000), v("2026-10-06", 100_000, 56)], compras: [], tasaPpmBps: 0 });
    expect(r[0]).toMatchObject({ debito: 209_000, iva: 209_000 });
  });
  it("con más crédito que débito no hay IVA a pagar", () => {
    const r = impuestosPorPeriodo({ ventas: [v("2026-10-05", 100_000)], compras: [{ fecha: "2026-10-10", tipoDte: 33, montoNeto: 400_000, montoExento: 0, montoIva: 76_000 }], tasaPpmBps: 0 });
    expect(r[0]).toMatchObject({ iva: 0, ppm: 0 });
  });
});

describe("pagosDeImpuestos", () => {
  const impuestos = [{ periodo: "2026-10", debito: 0, credito: 0, iva: 190_000, ppm: 14_000 }];
  it("IVA y PPM del mes M se pagan en M+1", () => {
    expect(pagosDeImpuestos(impuestos, 20, new Set())).toEqual([
      { tipo: "iva", periodo: "2026-10", fecha: "2026-11-20", monto: 190_000, postergado: false },
      { tipo: "ppm", periodo: "2026-10", fecha: "2026-11-20", monto: 14_000, postergado: false },
    ]);
  });
  it("postergar el IVA lo lleva a M+2 y el PPM sigue en M+1", () => {
    expect(pagosDeImpuestos(impuestos, 20, new Set(["2026-10"]))).toEqual([
      { tipo: "iva", periodo: "2026-10", fecha: "2026-12-20", monto: 190_000, postergado: true },
      { tipo: "ppm", periodo: "2026-10", fecha: "2026-11-20", monto: 14_000, postergado: false },
    ]);
  });
});
