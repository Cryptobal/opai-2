import { describe, expect, it } from "vitest";

import { claseDelCatalogo, clasesEfectivas, clasesPorVertical, clasesValidas } from "./clases";

describe("clases de ausencia (CAR-393)", () => {
  it("valida el catálogo de la empresa y rechaza tipos desconocidos o nombres repetidos", () => {
    expect(clasesValidas([{ nombre: " Licencia mutual ", tipo: "licencia" }])).toEqual([
      { nombre: "Licencia mutual", tipo: "licencia" },
    ]);
    expect(clasesValidas([{ nombre: "Otro", tipo: "feriado" }])).toBeNull();
    expect(clasesValidas([{ nombre: "ab", tipo: "permiso" }])).toBeNull();
    expect(
      clasesValidas([
        { nombre: "Trámite", tipo: "permiso" },
        { nombre: "trámite", tipo: "permiso" },
      ]),
    ).toBeNull();
    expect(clasesValidas("x")).toBeNull();
  });

  it("sin catálogo propio (o inválido) rige el de la vertical", () => {
    expect(clasesEfectivas([], "seguridad")).toEqual(clasesPorVertical("seguridad"));
    expect(clasesEfectivas(null, "aseo")).toEqual(clasesPorVertical("aseo"));
    const propio = [{ nombre: "Licencia mutual", tipo: "licencia" }];
    expect(clasesEfectivas(propio, "seguridad")).toEqual(propio);
    expect(clasesPorVertical("seguridad").every((c) => c.nombre.length >= 3)).toBe(true);
  });

  it("una clase solo vale con su tipo, sin importar mayúsculas", () => {
    const cat = clasesPorVertical("seguridad");
    expect(claseDelCatalogo(cat, "vacaciones", "feriado legal")?.nombre).toBe("Feriado legal");
    expect(claseDelCatalogo(cat, "permiso", "Feriado legal")).toBeNull();
  });
});
