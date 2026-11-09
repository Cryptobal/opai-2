import { describe, expect, it } from "vitest";

import { type BorradorCobertura, entradaCobertura } from "../lib/cobertura-entrada";

const b = (o: Partial<BorradorCobertura> = {}): BorradorCobertura => ({
  seccionId: "s1",
  esquemaId: "e1",
  modo: "todos",
  todos: { cargoId: "c1", sueldo: "680000" },
  porTramo: {},
  ...o,
});

describe("entrada de «Agregar cobertura»", () => {
  it("un cargo y sueldo para todos los puestos", () => {
    expect(entradaCobertura(b(), true)).toEqual({ seccionId: "s1", esquemaId: "e1", cargoId: "c1", sueldoBaseClp: 680000 });
  });
  it("sin permiso de costos no viaja el sueldo", () => {
    expect(entradaCobertura(b(), false)).toEqual({ seccionId: "s1", esquemaId: "e1", cargoId: "c1" });
  });
  it("sin cargo ni sueldo no manda nada de más", () => {
    expect(entradaCobertura(b({ todos: { cargoId: "", sueldo: "" } }), true)).toEqual({ seccionId: "s1", esquemaId: "e1" });
  });
  it("un cargo distinto por tramo omite los tramos sin ajuste", () => {
    const r = entradaCobertura(
      b({ modo: "tramo", porTramo: { t1: { cargoId: "c2", sueldo: "" }, t2: { cargoId: "", sueldo: "" } } }),
      true,
    );
    expect(r).toEqual({ seccionId: "s1", esquemaId: "e1", porTramo: [{ tramoId: "t1", cargoId: "c2" }] });
  });
});
