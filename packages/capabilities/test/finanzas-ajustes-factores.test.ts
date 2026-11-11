import { describe, expect, it } from "vitest";

import { ajustesFinanzas } from "../src/finanzas/ajustes";

const campo = ajustesFinanzas.shape.factores_cesion;
const FACTOR = { nombre: "Factor Demo SpA", rut: "76.123.456-0", email: "ops@factor.test", direccion: "Av. Demo 123" };

describe("ajuste finanzas.factores_cesion", () => {
  it("por defecto no hay factores", () => {
    expect(campo.parse(undefined)).toEqual([]);
  });

  it("acepta un factor con RUT válido; correo y dirección son opcionales", () => {
    expect(campo.parse([FACTOR])).toEqual([FACTOR]);
    expect(campo.safeParse([{ nombre: "Solo RUT", rut: "76.123.456-0" }]).success).toBe(true);
  });

  it("rechaza un RUT inválido y los largos que Octava cortaría", () => {
    expect(campo.safeParse([{ ...FACTOR, rut: "76.123.456-1" }]).success).toBe(false);
    expect(campo.safeParse([{ ...FACTOR, email: `${"a".repeat(40)}@factor.test` }]).success).toBe(false);
    expect(campo.safeParse([{ ...FACTOR, direccion: "x".repeat(71) }]).success).toBe(false);
  });

  it("no admite el mismo RUT dos veces, aunque venga con otro formato", () => {
    expect(campo.safeParse([FACTOR, { nombre: "Otro", rut: "76123456-0" }]).success).toBe(false);
  });
});
