import { describe, expect, it } from "vitest";

import {
  codigoCotizacion,
  esEditable,
  estadoTrasEditar,
  leerCodigoCotizacion,
  puedeTransicionar,
  siguienteNumero,
} from ".";

describe("estados de la cotización (R40, R41, §6)", () => {
  it("permite las transiciones de §6", () => {
    expect(puedeTransicionar("borrador", "lista")).toBe(true);
    expect(puedeTransicionar("borrador", "en_aprobacion")).toBe(true);
    expect(puedeTransicionar("en_aprobacion", "lista")).toBe(true);
    expect(puedeTransicionar("lista", "enviada")).toBe(true);
    expect(puedeTransicionar("enviada", "reemplazada")).toBe(true);
    expect(puedeTransicionar("borrador", "archivada")).toBe(true);
  });

  it("rechaza saltos fuera de §6", () => {
    expect(puedeTransicionar("borrador", "enviada")).toBe(false);
    expect(puedeTransicionar("en_aprobacion", "enviada")).toBe(false);
    expect(puedeTransicionar("rechazada", "borrador")).toBe(false);
    expect(puedeTransicionar("reemplazada", "enviada")).toBe(false);
  });

  it("editar una versión en aprobación o lista la vuelve a borrador (R41)", () => {
    expect(estadoTrasEditar("en_aprobacion")).toBe("borrador");
    expect(estadoTrasEditar("lista")).toBe("borrador");
    expect(estadoTrasEditar("borrador")).toBe("borrador");
  });

  it("una versión enviada o cerrada no se edita (R43)", () => {
    expect(esEditable("enviada")).toBe(false);
    expect(esEditable("aceptada")).toBe(false);
    expect(() => estadoTrasEditar("enviada")).toThrow();
  });
});

describe("código CPQ-AAAA-NNN (R54)", () => {
  it("rellena a 3 dígitos y admite más", () => {
    expect(codigoCotizacion(2026, 7)).toBe("CPQ-2026-007");
    expect(codigoCotizacion(2026, 1234)).toBe("CPQ-2026-1234");
  });

  it("lee el código y descarta los de 1.0 con sufijo", () => {
    expect(leerCodigoCotizacion("CPQ-2026-159")).toEqual({ anio: 2026, numero: 159 });
    expect(leerCodigoCotizacion("CPQ-2026-159-defe")).toBeNull();
  });

  it("continúa desde el último número", () => {
    expect(siguienteNumero(null)).toBe(1);
    expect(siguienteNumero(340)).toBe(341);
  });

  it("rechaza números inválidos", () => {
    expect(() => codigoCotizacion(2026, 0)).toThrow();
    expect(() => codigoCotizacion(26, 1)).toThrow();
  });
});
