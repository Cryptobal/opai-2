import { describe, expect, it } from "vitest";

import {
  diasPlazoPortal,
  mensajeAcuseArco,
  normalizarCamposArco,
  plazoPortal,
  validarDetalleArco,
} from "./portal-trabajador-arco";

describe("portal trabajador · ARCO (dominio)", () => {
  it("valida el detalle obligatorio", () => {
    expect(validarDetalleArco("   corto  ")).toMatch(/10 caracteres/);
    expect(validarDetalleArco(" ".repeat(2001))).toMatch(/10 caracteres/);
    expect(validarDetalleArco("x".repeat(2001))).toMatch(/2000/);
    expect(validarDetalleArco("Quiero corregir mi dirección registrada.")).toBeNull();
  });

  it("normaliza campos sin duplicados", () => {
    expect(normalizarCamposArco([" Teléfono ", "telefono", "  "])).toEqual(["Teléfono"]);
  });

  it("calcula plazo con ajuste o 30 días por defecto", () => {
    expect(diasPlazoPortal(null)).toBe(30);
    expect(diasPlazoPortal(15)).toBe(15);
    const recibida = new Date("2026-11-01T12:00:00.000Z");
    expect(plazoPortal(recibida, null)?.toISOString()).toBe("2026-12-01T12:00:00.000Z");
  });

  it("mensaje de acuse distingue supresión", () => {
    expect(mensajeAcuseArco("rectificacion")).toContain("30 días");
    expect(mensajeAcuseArco("cancelacion")).toContain("eliminación");
  });
});
