import { describe, expect, it } from "vitest";

import { formatearTelefono, normalizarTelefono } from "./telefono";

describe("teléfono", () => {
  it("normaliza móviles y fijos chilenos a E.164", () => {
    expect(normalizarTelefono("+56 9 8765 4321")).toBe("+56987654321");
    expect(normalizarTelefono("987654321")).toBe("+56987654321");
    expect(normalizarTelefono("0056987654321")).toBe("+56987654321");
    expect(normalizarTelefono("22 987 6543")).toBe("+56229876543");
    expect(normalizarTelefono("2 2987 6543")).toBe("+56229876543");
  });
  it("rechaza largos inválidos", () => {
    expect(normalizarTelefono("8765432")).toBeNull();
    expect(normalizarTelefono("abc")).toBeNull();
  });
  it("formatea para mostrar", () => {
    expect(formatearTelefono("+56987654321")).toBe("+56 9 8765 4321");
  });
});
