import { describe, expect, it } from "vitest";

import {
  corrigeSoloTexto,
  montoDeNotaValido,
  montoParaNota,
} from "../app/(erp)/finanzas/ventas/_componentes/monto-nota";

describe("monto de la nota de crédito según lo que corrige", () => {
  it("corregir texto no lleva monto: se manda 0 aunque el campo traiga el total", () => {
    expect(corrigeSoloTexto("2")).toBe(true);
    expect(montoParaNota("2", "11900")).toBe(0);
    expect(montoParaNota("2", "")).toBe(0);
  });

  it("anular y corregir montos mandan el monto escrito", () => {
    expect(corrigeSoloTexto("1")).toBe(false);
    expect(corrigeSoloTexto("3")).toBe(false);
    expect(montoParaNota("1", "11900")).toBe(11900);
    expect(montoParaNota("3", "500")).toBe(500);
  });

  it("corregir texto es válido sin monto; los otros exigen entero entre 1 y el total", () => {
    expect(montoDeNotaValido("2", "", 11900)).toBe(true);
    expect(montoDeNotaValido("1", "", 11900)).toBe(false);
    expect(montoDeNotaValido("1", "0", 11900)).toBe(false);
    expect(montoDeNotaValido("3", "11901", 11900)).toBe(false);
    expect(montoDeNotaValido("3", "11900", 11900)).toBe(true);
  });
});
