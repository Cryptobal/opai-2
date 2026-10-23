import { describe, expect, it } from "vitest";

import { capitalizar, esVertical, TERMINOS, VERTICALES, vocabulario } from "./vocabulario";

describe("vocabulario", () => {
  it("cada vertical define singular y plural para todos los términos", () => {
    for (const vertical of VERTICALES) {
      const v = vocabulario(vertical);
      expect(v.vertical.length).toBeGreaterThan(0);
      for (const t of TERMINOS) {
        expect(v[t].singular.length, `${vertical}.${t}`).toBeGreaterThan(0);
        expect(v[t].plural.length, `${vertical}.${t}`).toBeGreaterThan(0);
      }
    }
  });

  it("seguridad usa guardia y ronda", () => {
    expect(vocabulario("seguridad").persona.plural).toBe("guardias");
    expect(vocabulario("seguridad").recorrido.singular).toBe("ronda");
  });

  it("una vertical desconocida cae en seguridad", () => {
    expect(esVertical("mineria")).toBe(false);
    expect(vocabulario("mineria")).toEqual(vocabulario("seguridad"));
  });

  it("capitaliza respetando tildes", () => {
    expect(capitalizar("técnicos")).toBe("Técnicos");
    expect(capitalizar("")).toBe("");
  });
});
