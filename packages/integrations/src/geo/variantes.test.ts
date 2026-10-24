import { describe, expect, it } from "vitest";

import { variantesDeBusqueda } from "./variantes";

describe("variantesDeBusqueda", () => {
  it("una dirección completa con comas y región prueba sin región y luego solo la calle", () => {
    expect(
      variantesDeBusqueda("Av. Libertador Bernardo O'Higgins 1449, Santiago, Región Metropolitana"),
    ).toEqual([
      "Av. Libertador Bernardo O'Higgins 1449, Santiago, Región Metropolitana",
      "Av. Libertador Bernardo O'Higgins 1449, Santiago",
      "Av. Libertador Bernardo O'Higgins 1449",
    ]);
  });

  it("quita la región y el país aunque no haya comas antes de la región", () => {
    expect(variantesDeBusqueda("Las Industrias 4520 Quilicura Región Metropolitana, Chile")).toEqual(
      [
        "Las Industrias 4520 Quilicura Región Metropolitana, Chile",
        "Las Industrias 4520 Quilicura",
      ],
    );
  });

  it("un texto simple queda como única variante", () => {
    expect(variantesDeBusqueda("  Las   Industrias 4520 ")).toEqual(["Las Industrias 4520"]);
  });

  it("descarta variantes de menos de 3 caracteres y duplicadas", () => {
    expect(variantesDeBusqueda("ab, Región Metropolitana")).toEqual(["ab, Región Metropolitana"]);
    expect(variantesDeBusqueda("Providencia, Providencia")).toEqual([
      "Providencia, Providencia",
      "Providencia",
    ]);
  });
});
