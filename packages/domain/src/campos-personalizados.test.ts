import { describe, expect, it } from "vitest";

import {
  ENTIDADES_CAMPO_PERSONALIZADO,
  claveCampoPersonalizado,
  entidadesCampoActivas,
  normalizarOpcionesCampo,
} from "./campos-personalizados";

describe("campos personalizados · clave", () => {
  it("deriva snake_case ASCII del nombre", () => {
    expect(claveCampoPersonalizado("N° de guardias")).toBe("n_de_guardias");
    expect(claveCampoPersonalizado("  Rubro principal ")).toBe("rubro_principal");
    expect(claveCampoPersonalizado("Año de inicio")).toBe("ano_de_inicio");
  });
  it("empieza siempre con letra", () => {
    expect(claveCampoPersonalizado("2024 meta")).toBe("campo_2024_meta");
  });
});

describe("campos personalizados · fichas", () => {
  it("ofrece las del núcleo siempre y las de un módulo solo si está activo", () => {
    expect(entidadesCampoActivas([])).toEqual(["cuenta", "contacto", "instalacion", "persona"]);
    expect(entidadesCampoActivas(["comercial"])).toEqual(ENTIDADES_CAMPO_PERSONALIZADO);
  });
});

describe("campos personalizados · opciones", () => {
  it("quita vacías y valores repetidos sin distinguir mayúsculas", () => {
    expect(normalizarOpcionesCampo([" Minería", "", "minería", "Retail "])).toEqual([
      { valor: "Minería", etiqueta: "Minería" },
      { valor: "Retail", etiqueta: "Retail" },
    ]);
  });
  it("respeta el valor interno y usa la etiqueta si falta", () => {
    expect(
      normalizarOpcionesCampo([
        { valor: " min ", etiqueta: "Minería" },
        { valor: "", etiqueta: "Retail" },
        { valor: "MIN", etiqueta: "Otra" },
      ]),
    ).toEqual([
      { valor: "min", etiqueta: "Minería" },
      { valor: "Retail", etiqueta: "Retail" },
    ]);
  });
});
