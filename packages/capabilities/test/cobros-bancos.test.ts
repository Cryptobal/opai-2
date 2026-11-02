import { describe, expect, it } from "vitest";

import { ErrorCapacidad, validarDocumentoCobroBanco, validarDocumentoCompraBanco } from "../src";

const docBase = {
  id: "00000000-0000-4000-8000-000000000001",
  tipoDte: 33,
  montoTotal: 100_000,
  estadoDte: "aceptado",
  cesionEstado: null as string | null,
};

function rechaza(patch: Partial<typeof docBase>, signo: number) {
  expect(() => validarDocumentoCobroBanco({ ...docBase, ...patch }, signo)).toThrow(ErrorCapacidad);
}

describe("validarDocumentoCobroBanco · C5", () => {
  it("rechaza documento cedido", () => {
    rechaza({ cesionEstado: "cedido" }, 50_000);
  });

  it("rechaza documento rechazado por el SII", () => {
    rechaza({ estadoDte: "rechazado" }, 50_000);
  });

  it("rechaza documento anulado por nota de crédito", () => {
    rechaza({ estadoDte: "anulado_nc" }, 50_000);
  });

  it("rechaza tipos que no son factura (61)", () => {
    rechaza({ tipoDte: 61 }, 50_000);
  });

  it("rechaza tipos que no son factura (56)", () => {
    rechaza({ tipoDte: 56 }, 50_000);
  });

  it("rechaza enlace sobre movimiento negativo", () => {
    rechaza({}, -50_000);
  });
});

describe("validarDocumentoCompraBanco · Paridad signo compras", () => {
  const docCompra = { tipoDte: 33 };

  it("rechaza enlace sobre movimiento positivo (debe ser cargo)", () => {
    expect(() => validarDocumentoCompraBanco(docCompra, 50_000)).toThrow(ErrorCapacidad);
  });

  it("acepta movimiento negativo", () => {
    expect(() => validarDocumentoCompraBanco(docCompra, -50_000)).not.toThrow();
  });
});
