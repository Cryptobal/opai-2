import { describe, expect, it } from "vitest";

import {
  aging,
  type DocumentoCobranza,
  diasVencido,
  esCobrable,
  estaVencida,
  evaluarRecordatorio,
  saldoPendiente,
  tramoDe,
  vencimientoEfectivo,
} from "./cobranza";

const doc = (p: Partial<DocumentoCobranza> = {}): DocumentoCobranza => ({
  tipoDte: 33,
  estadoDte: "aceptado",
  cesionEstado: null,
  montoTotal: 1_000_000,
  montoCobrado: 0,
  fechaVencimiento: "2026-10-01",
  fechaEmision: "2026-09-01",
  ...p,
});
const sinFeriados = new Set<string>();

describe("vencimiento", () => {
  it("el día del vencimiento no está vencida; al siguiente sí", () => {
    expect(estaVencida(doc(), "2026-10-01")).toBe(false);
    expect(estaVencida(doc(), "2026-10-02")).toBe(true);
    expect(diasVencido("2026-10-01", "2026-10-01")).toBe(0);
  });
  it("sin vencimiento propio usa emisión + plazo por defecto", () => {
    expect(vencimientoEfectivo({ fechaVencimiento: null, fechaEmision: "2026-09-01" })).toBe("2026-10-01");
    expect(vencimientoEfectivo({ fechaVencimiento: null, fechaEmision: "2026-09-01" }, 15)).toBe("2026-09-16");
    expect(vencimientoEfectivo({ fechaVencimiento: null, fechaEmision: null })).toBeNull();
  });
  it("un abono parcial vencido sigue en cobranza por el saldo", () => {
    const d = doc({ montoCobrado: 400_000 });
    expect(saldoPendiente(d)).toBe(600_000);
    expect(estaVencida(d, "2026-10-10")).toBe(true);
  });
});

describe("universo cobrable", () => {
  it.each([
    ["nota de crédito", { tipoDte: 61 }],
    ["borrador", { estadoDte: "borrador" }],
    ["rechazado", { estadoDte: "rechazado" }],
    ["anulado por NC", { estadoDte: "anulado_nc" }],
    ["cedido", { cesionEstado: "cedido" }],
    ["pagado", { montoCobrado: 1_000_000 }],
  ])("excluye %s", (_n, p) => {
    expect(esCobrable(doc(p))).toBe(false);
    expect(estaVencida(doc(p), "2027-01-01")).toBe(false);
  });
  it("el saldo nunca es negativo", () => {
    expect(saldoPendiente(doc({ montoCobrado: 2_000_000 }))).toBe(0);
  });
});

describe("tramos y aging", () => {
  it("fronteras 30/31 y 60/61", () => {
    expect([0, 1, 30, 31, 60, 61, -5].map(tramoDe)).toEqual([
      "por_vencer", "1_30", "1_30", "31_60", "31_60", "61_mas", "por_vencer",
    ]);
  });
  it("suma saldos por tramo e ignora lo no cobrable", () => {
    const docs = [
      doc({ fechaVencimiento: "2026-10-20" }),
      doc({ fechaVencimiento: "2026-09-20", montoCobrado: 100_000 }),
      doc({ fechaVencimiento: "2026-08-01" }),
      doc({ fechaVencimiento: "2026-11-20" }),
      doc({ tipoDte: 61 }),
    ];
    expect(aging(docs, "2026-11-04")).toEqual({
      por_vencer: 1_000_000,
      "1_30": 1_000_000,
      "31_60": 900_000,
      "61_mas": 1_000_000,
    });
  });
});

describe("recordatorios", () => {
  const base = { hoy: "2026-10-06", pasosEnviados: [] as number[], pasos: [3, 7, 12], ambito: sinFeriados };
  it("toca el paso 1 a los 3 días hábiles del vencimiento", () => {
    // vence mié 1-oct; +3 hábiles = lun 6-oct
    expect(evaluarRecordatorio({ ...base, doc: doc() })).toEqual({ accion: "enviar", paso: 1 });
    expect(evaluarRecordatorio({ ...base, hoy: "2026-10-05", doc: doc() })).toEqual({ accion: "omitir", motivo: "no_toca" });
  });
  it("los feriados corren la fecha", () => {
    const ambito = new Set(["2026-10-05"]);
    expect(evaluarRecordatorio({ ...base, ambito, doc: doc() })).toEqual({ accion: "omitir", motivo: "no_toca" });
    expect(evaluarRecordatorio({ ...base, ambito, hoy: "2026-10-07", doc: doc() })).toEqual({ accion: "enviar", paso: 1 });
  });
  it("sale un paso por ejecución y respeta el tope", () => {
    const tarde = { ...base, hoy: "2026-12-01", doc: doc() };
    expect(evaluarRecordatorio({ ...tarde, pasosEnviados: [1] })).toEqual({ accion: "enviar", paso: 2 });
    expect(evaluarRecordatorio({ ...tarde, pasosEnviados: [1, 2, 3] })).toEqual({ accion: "omitir", motivo: "tope" });
  });
  it("se detiene al pagar, al pausar o sin pasos", () => {
    expect(evaluarRecordatorio({ ...base, doc: doc({ montoCobrado: 1_000_000 }) })).toEqual({ accion: "omitir", motivo: "no_vencida" });
    expect(evaluarRecordatorio({ ...base, doc: doc({ cobranzaPausada: true }) })).toEqual({ accion: "omitir", motivo: "pausada" });
    expect(evaluarRecordatorio({ ...base, pasos: [], doc: doc() })).toEqual({ accion: "omitir", motivo: "sin_pasos" });
  });
  it("no vencida no recuerda", () => {
    expect(evaluarRecordatorio({ ...base, hoy: "2026-09-20", doc: doc() })).toEqual({ accion: "omitir", motivo: "no_vencida" });
  });
});

describe("saldoPendiente con notas de crédito parciales (regla de Carlos, 4-nov-2026)", () => {
  it("factura de 1.000.000 con NC parcial de 200.000 queda con pendiente 800.000", () => {
    expect(saldoPendiente({ montoTotal: 1_000_000, montoCobrado: 0, montoNotasCredito: 200_000 })).toBe(800_000);
  });
  it("descuenta también lo ya cobrado y nunca baja de cero", () => {
    expect(saldoPendiente({ montoTotal: 1_000_000, montoCobrado: 500_000, montoNotasCredito: 200_000 })).toBe(300_000);
    expect(saldoPendiente({ montoTotal: 1_000_000, montoCobrado: 900_000, montoNotasCredito: 200_000 })).toBe(0);
  });
  it("sin notas de crédito se comporta como antes", () => {
    expect(saldoPendiente({ montoTotal: 100, montoCobrado: 30 })).toBe(70);
  });
});
