import { describe, expect, it } from "vitest";

import { ajustesFinanzas } from "../src/finanzas/ajustes";

const campo = ajustesFinanzas.shape.plantillas_glosa_ventas;

describe("ajuste finanzas.plantillas_glosa_ventas", () => {
  it("por defecto no hay plantillas", () => {
    expect(campo.parse(undefined)).toEqual([]);
  });

  it("acepta plantillas con los marcadores conocidos", () => {
    const lista = [{ nombre: "Mensual UF", texto: "Servicio {{periodo}} · UF {{uf_valor}} · total {{monto}}" }];
    expect(campo.parse(lista)).toEqual(lista);
  });

  it("rechaza un marcador que no existe (no saldría una factura con «{{algo}}» sin resolver)", () => {
    expect(campo.safeParse([{ nombre: "Mala", texto: "Servicio {{mes}}" }]).success).toBe(false);
  });

  it("limita el largo, el nombre y la cantidad", () => {
    expect(campo.safeParse([{ nombre: "", texto: "x" }]).success).toBe(false);
    expect(campo.safeParse([{ nombre: "n", texto: "x".repeat(301) }]).success).toBe(false);
    expect(campo.safeParse(Array.from({ length: 21 }, (_, i) => ({ nombre: `n${i}`, texto: "x" }))).success).toBe(false);
  });
});
