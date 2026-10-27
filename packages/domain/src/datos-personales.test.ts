import { describe, expect, it } from "vitest";

import { camposACifrar, defineDatosPersonales } from "./datos-personales";

const valida = {
  tabla: "personas",
  finalidad: "Gestión del personal de la empresa.",
  categorias: ["identificacion", "laboral"] as const,
  campos: ["nombres", "rut"],
  baseLicitud: "relacion_laboral" as const,
};

describe("defineDatosPersonales", () => {
  it("adjunta el módulo y conserva la declaración", () => {
    const [d] = defineDatosPersonales("core", [valida]);
    expect(d).toMatchObject({ modulo: "core", tabla: "personas", baseLicitud: "relacion_laboral" });
  });

  it("rechaza categoría o base de licitud desconocida", () => {
    expect(() =>
      defineDatosPersonales("core", [{ ...valida, categorias: ["otra"] as never }]),
    ).toThrow(/categoría inválida/);
    expect(() =>
      defineDatosPersonales("core", [{ ...valida, baseLicitud: "inventada" as never }]),
    ).toThrow(/base de licitud inválida/);
  });

  it("exige finalidad, campos y que los sensibles estén entre los campos", () => {
    expect(() => defineDatosPersonales("core", [{ ...valida, finalidad: "corta" }])).toThrow(
      /finalidad/,
    );
    expect(() => defineDatosPersonales("core", [{ ...valida, campos: [] }])).toThrow(/sin campos/);
    expect(() =>
      defineDatosPersonales("core", [{ ...valida, camposSensibles: ["salud"] }]),
    ).toThrow(/sensible "salud" no está en campos/);
  });

  it("lo sensible va con su categoría y viceversa (§16.4)", () => {
    expect(() =>
      defineDatosPersonales("core", [{ ...valida, camposSensibles: ["rut"] }]),
    ).toThrow(/no la categoría "sensible"/);
    expect(() =>
      defineDatosPersonales("core", [{ ...valida, categorias: ["sensible"] }]),
    ).toThrow(/sin camposSensibles/);
    const ok = defineDatosPersonales("core", [
      { ...valida, categorias: ["sensible"], camposSensibles: ["rut"] },
    ]);
    expect(camposACifrar(ok)).toEqual([{ tabla: "personas", campo: "rut" }]);
  });

  it("rechaza declarar la misma tabla dos veces", () => {
    expect(() => defineDatosPersonales("core", [valida, valida])).toThrow(/dos veces/);
  });
});
