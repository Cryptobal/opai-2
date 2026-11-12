import { describe, expect, it } from "vitest";

import {
  BANCOS_SBIF,
  bancoPorCodigo,
  CODIGOS_BANCO,
  codigoSbif,
  etiquetaTipoCuenta,
  nombreBanco,
  tipoCuentaCanonico,
} from "./bancos";

describe("catálogo de bancos SBIF (CAR-244)", () => {
  it("códigos únicos de 3 dígitos", () => {
    expect(new Set(CODIGOS_BANCO).size).toBe(BANCOS_SBIF.length);
    for (const c of CODIGOS_BANCO) expect(c).toMatch(/^\d{3}$/);
  });
  it("reconoce la lista de Carlos por nombre o por código", () => {
    const casos: [string, string][] = [
      ["Banco de Chile", "001"],
      ["BancoEstado", "012"],
      ["Banco Estado", "012"],
      ["banco estado", "012"],
      ["Scotiabank", "014"],
      ["BCI", "016"],
      ["MACH", "016"],
      ["Santander", "037"],
      ["Banco Santander", "037"],
      ["Itaú", "039"],
      ["ITAU", "039"],
      ["Banco Falabella", "051"],
      ["Mercado Pago", "299"],
      ["Edwards-Citi", "504"],
      ["Coopeuch", "672"],
      ["Tenpo", "730"],
      ["Prex", "743"],
      ["037", "037"],
      [" 012 ", "012"],
      ["Banco BICE", "028"],
      ["Banco Internacional", "009"],
    ];
    for (const [banco, sbif] of casos) expect(codigoSbif(banco), banco).toBe(sbif);
  });
  it("lo no reconocido queda en null para corrección manual", () => {
    for (const b of ["Banco Inexistente", "999", "37", "", null, undefined])
      expect(codigoSbif(b)).toBeNull();
  });
  it("nombre por código y nada para códigos desconocidos", () => {
    expect(nombreBanco("012")).toBe("BancoEstado");
    expect(nombreBanco("Santander")).toBeNull();
    expect(bancoPorCodigo("504")?.nombre).toBe("Banco Edwards-Citi");
  });
  it("normaliza el tipo de cuenta escrito a mano", () => {
    const casos: [string, string | null][] = [
      ["Cuenta RUT", "rut"],
      ["cuenta rut", "rut"],
      ["Cuenta corriente", "corriente"],
      ["CTA CORRIENTE", "corriente"],
      ["Cuenta vista", "vista"],
      ["Chequera electrónica", "vista"],
      ["Cuenta de ahorro", "ahorro"],
      ["vista", "vista"],
      ["otra", null],
      ["", null],
    ];
    for (const [t, v] of casos) expect(tipoCuentaCanonico(t), t).toBe(v);
    expect(etiquetaTipoCuenta("rut")).toBe("Cuenta RUT");
    expect(etiquetaTipoCuenta("Cuenta RUT")).toBeNull();
  });
});
