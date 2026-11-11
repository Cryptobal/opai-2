import { describe, expect, it } from "vitest";

import {
  envolverSeleccion,
  gruposDeVariables,
  insertarEnTexto,
  parrafosDePlantilla,
  segmentosDeParrafo,
} from "./documento-plantillas-texto";

describe("texto de plantillas laborales", () => {
  it("separa párrafos por línea en blanco y conserva los saltos simples", () => {
    const p = parrafosDePlantilla("Primero: uno.\r\n\r\n  \nSegundo: dos\ny tres.\n\n");
    expect(p).toHaveLength(2);
    expect(p[1]).toEqual([
      { tipo: "texto", texto: "Segundo: dos\ny tres.", negrita: false, cursiva: false },
    ]);
  });

  it("marca variables conocidas y desconocidas", () => {
    expect(segmentosDeParrafo("RUT {persona.rut}, comuna {persona.comuna_obra}.")).toEqual([
      { tipo: "texto", texto: "RUT ", negrita: false, cursiva: false },
      { tipo: "variable", clave: "persona.rut", conocida: true, negrita: false, cursiva: false },
      { tipo: "texto", texto: ", comuna ", negrita: false, cursiva: false },
      {
        tipo: "variable",
        clave: "persona.comuna_obra",
        conocida: false,
        negrita: false,
        cursiva: false,
      },
      { tipo: "texto", texto: ".", negrita: false, cursiva: false },
    ]);
  });

  it("aplica negrita y cursiva, también sobre variables", () => {
    const s = segmentosDeParrafo(
      "**Primero:** el *trabajador* {persona.nombre} y **{vinculo.cargo}**",
    );
    expect(s.map((x) => [x.tipo, x.negrita, x.cursiva])).toEqual([
      ["texto", true, false],
      ["texto", false, false],
      ["texto", false, true],
      ["texto", false, false],
      ["variable", false, false],
      ["texto", false, false],
      ["variable", true, false],
    ]);
  });

  it("deja tal cual un asterisco suelto o llaves ajenas", () => {
    expect(segmentosDeParrafo("Nota * al pie {sin punto}")).toEqual([
      { tipo: "texto", texto: "Nota * al pie {sin punto}", negrita: false, cursiva: false },
    ]);
  });

  it("agrupa y filtra variables sin tildes", () => {
    expect(gruposDeVariables().map((g) => g.titulo)).toEqual([
      "Persona",
      "Vínculo",
      "Instalación",
      "Sueldo",
      "Contrato",
    ]);
    const r = gruposDeVariables("direccion");
    expect(r.flatMap((g) => g.variables.map((v) => v.clave))).toEqual([
      "persona.direccion",
      "instalacion.direccion",
    ]);
    expect(gruposDeVariables("vinculo")[0]?.grupo).toBe("vinculo");
    expect(gruposDeVariables("zzz")).toEqual([]);
  });

  it("inserta en el cursor y envuelve la selección", () => {
    expect(insertarEnTexto("RUT .", 4, 4, "{persona.rut}")).toEqual({
      texto: "RUT {persona.rut}.",
      cursor: 17,
    });
    expect(insertarEnTexto("abc", 10, 2, "x")).toEqual({ texto: "abcx", cursor: 4 });
    expect(envolverSeleccion("el sueldo base", 3, 9, "**")).toEqual({
      texto: "el **sueldo** base",
      inicio: 5,
      fin: 11,
    });
    expect(envolverSeleccion("ab", 1, 1, "*").texto).toBe("a*cursiva*b");
  });
});
