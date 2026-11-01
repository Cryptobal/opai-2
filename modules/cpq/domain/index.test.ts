import { describe, expect, it } from "vitest";

import {
  ESTADOS_COTIZACION,
  anioEnZona,
  esEditable,
  formatearCodigo,
  puedeTransicionar,
  validaHastaPorDefecto,
} from "./index";

describe("formatearCodigo", () => {
  it("rellena el número a tres dígitos y deja crecer sin tope", () => {
    expect(formatearCodigo(2026, 7)).toBe("CPQ-2026-007");
    expect(formatearCodigo(2026, 340)).toBe("CPQ-2026-340");
    expect(formatearCodigo(2027, 1234)).toBe("CPQ-2027-1234");
  });
  it("rechaza año o número inválidos", () => {
    expect(() => formatearCodigo(2026, 0)).toThrow(RangeError);
    expect(() => formatearCodigo(26, 1)).toThrow(RangeError);
  });
});

describe("anioEnZona", () => {
  it("usa la zona del tenant: 1-ene 02:00 UTC sigue siendo 31-dic en Chile", () => {
    expect(anioEnZona(new Date("2027-01-01T02:00:00Z"))).toBe(2026);
    expect(anioEnZona(new Date("2027-01-01T05:00:00Z"))).toBe(2027);
  });
});

describe("validaHastaPorDefecto", () => {
  it("suma 30 días al día de hoy en la zona del tenant", () => {
    expect(validaHastaPorDefecto(new Date("2026-10-31T15:00:00Z"))).toBe("2026-11-30");
    expect(validaHastaPorDefecto(new Date("2026-12-15T12:00:00Z"), 30)).toBe("2027-01-14");
  });
});

describe("estados (R40)", () => {
  it("sigue la máquina de cpq.md §6", () => {
    expect(puedeTransicionar("borrador", "lista")).toBe(true);
    expect(puedeTransicionar("borrador", "enviada")).toBe(false);
    expect(puedeTransicionar("lista", "enviada")).toBe(true);
    expect(puedeTransicionar("lista", "borrador")).toBe(true);
    expect(puedeTransicionar("enviada", "vencida")).toBe(true);
    expect(puedeTransicionar("enviada", "aceptada")).toBe(true);
    expect(puedeTransicionar("archivada", "borrador")).toBe(true);
  });
  it("vencida y reemplazada son terminales", () => {
    for (const t of ESTADOS_COTIZACION) {
      expect(puedeTransicionar("vencida", t)).toBe(false);
      expect(puedeTransicionar("reemplazada", t)).toBe(false);
    }
  });
  it("solo borrador, en_aprobacion y lista son editables", () => {
    expect(ESTADOS_COTIZACION.filter(esEditable)).toEqual(["borrador", "en_aprobacion", "lista"]);
  });
});
