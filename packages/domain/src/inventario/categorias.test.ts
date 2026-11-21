import { describe, expect, it } from "vitest";

import {
  categoriasEfectivas,
  categoriasValidas,
  claveCategoria,
  comportamientoDe,
} from "./categorias";

describe("categorias de inventario", () => {
  it("conserva la clave al renombrar", () => {
    const base = categoriasValidas([
      { clave: "epi", nombre: "EPI", comportamiento: "activo" },
      { nombre: "Uniforme", comportamiento: "ropa" },
    ]);
    expect(base).not.toBeNull();
    const renombrada = categoriasValidas([
      { clave: "epi", nombre: "Equipo de protección", comportamiento: "activo" },
      { clave: "uniforme", nombre: "Uniforme operativo", comportamiento: "ropa" },
    ]);
    expect(renombrada?.map((c) => c.clave)).toEqual(["epi", "uniforme"]);
  });

  it("rechaza claves o nombres duplicados", () => {
    expect(
      categoriasValidas([{ nombre: "Activo", comportamiento: "activo" }, { nombre: "activo", comportamiento: "ropa" }]),
    ).toBeNull();
    expect(categoriasValidas([{ clave: "ropa", nombre: "Otra", comportamiento: "activo" }, { nombre: "Ropa", comportamiento: "ropa" }])).toBeNull();
  });

  it("efectivas caen en activo y ropa", () => {
    expect(categoriasEfectivas([]).map((c) => c.clave)).toEqual(["activo", "ropa"]);
    expect(comportamientoDe("activo", categoriasEfectivas(null))).toBe("activo");
    expect(claveCategoria("Calzado de seguridad")).toBe("calzado_de_seguridad");
  });
});