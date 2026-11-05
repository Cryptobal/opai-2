import { describe, expect, it } from "vitest";

import { N } from "./numero";
import { personasPorPosicion } from "./dotacion";
import { puestoPrueba } from "./fixtures";

describe("dotación con patrones de la empresa (CAR-192)", () => {
  it("un patrón de fábrica se reconoce por nombre, con × o x", () => {
    expect(personasPorPosicion(puestoPrueba({ patron: "4×4" })).entero()).toBe(personasPorPosicion(puestoPrueba({ patron: "4x4" })).entero());
  });

  it("un patrón propio de la empresa se calcula con su definición, sin error", () => {
    const p = puestoPrueba({
      patron: "6x1",
      patronDef: { clase: "ciclico", diasTrabajo: 6, diasDescanso: 1, diasSemana: [] },
    });
    // 12 h, 7 días: cada persona trabaja 6 de 7 días → 7/6 personas por posición.
    expect(personasPorPosicion(p).por(N(10_000)).entero()).toBe(11_667);
  });

  it("sin definición y fuera de fábrica sigue fallando con un mensaje claro", () => {
    expect(() => personasPorPosicion(puestoPrueba({ patron: "6x1" }))).toThrow("Patrón no reconocido");
  });
});
