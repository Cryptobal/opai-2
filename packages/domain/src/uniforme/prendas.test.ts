import { describe, expect, it } from "vitest";

import { clavePrenda, prendasEfectivas, prendasPorVertical, prendasValidas } from "./prendas";

describe("prendas del uniforme (CAR-408)", () => {
  it("la clave sale del nombre, sin tildes ni espacios", () => {
    expect(clavePrenda("Pantalón")).toBe("pantalon");
    expect(clavePrenda("Calzado de seguridad")).toBe("calzado_de_seguridad");
    expect(clavePrenda("  Geólogo ")).toBe("geologo");
    expect(clavePrenda("2 piezas")).toBe("p_2_piezas");
  });

  it("seguridad conserva las siete prendas que eran columnas; una vertical sin lista usa la base", () => {
    expect(prendasPorVertical("seguridad").map((p) => p.clave)).toEqual([
      "camisa",
      "pantalon",
      "chaqueta",
      "polera",
      "geologo",
      "polar",
      "calzado",
    ]);
    expect(prendasPorVertical("otra").map((p) => p.clave)).toEqual([
      "camisa",
      "pantalon",
      "calzado",
    ]);
  });

  it("valida la lista propia y rechaza nombres repetidos o fuera de largo", () => {
    expect(prendasValidas([{ nombre: "Delantal" }, { nombre: "Guantes" }])).toEqual([
      { clave: "delantal", nombre: "Delantal" },
      { clave: "guantes", nombre: "Guantes" },
    ]);
    expect(prendasValidas([{ nombre: "Polera" }, { nombre: "polera" }])).toBeNull();
    expect(prendasValidas([{ nombre: "X" }])).toBeNull();
    expect(prendasValidas("no")).toBeNull();
  });

  it("sin lista propia válida rige la de la vertical", () => {
    expect(prendasEfectivas([], "aseo")[0]?.nombre).toBe("Cotona");
    expect(prendasEfectivas([{ nombre: "Delantal" }], "aseo")).toEqual([
      { clave: "delantal", nombre: "Delantal" },
    ]);
  });
});
