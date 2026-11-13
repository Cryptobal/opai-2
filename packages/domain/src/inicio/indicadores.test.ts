import { describe, expect, it } from "vitest";

import { INDICADORES_INICIO, INDICADORES_INICIO_DEFECTO, ordenarIndicadores } from "./indicadores";

describe("indicadores de Inicio elegidos por la empresa (CAR-335 D3)", () => {
  it("respeta el orden elegido y quita los que no están disponibles", () => {
    expect(
      ordenarIndicadores(["tickets", "cobertura"], ["cobertura", "negocios", "tickets"]),
    ).toEqual(["tickets", "cobertura"]);
  });

  it("sin elección (o con una lista vacía) usa los de por defecto", () => {
    expect(ordenarIndicadores([], [...INDICADORES_INICIO])).toEqual([
      ...INDICADORES_INICIO_DEFECTO,
    ]);
  });

  it("ignora ids desconocidos y repetidos", () => {
    expect(ordenarIndicadores(["x", "negocios", "negocios"], ["negocios"])).toEqual(["negocios"]);
  });
});
