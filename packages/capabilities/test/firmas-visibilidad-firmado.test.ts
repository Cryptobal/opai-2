import { describe, expect, it } from "vitest";

import { visibleParaFirmante } from "../src/core/firmas/visibilidad-firmado";

// CAR-499: el contrato o anexo firmado por la persona llega a su portal del trabajador.
describe("visibleParaFirmante", () => {
  const persona = { entidadTipo: "persona", entidadId: "p1" };

  it("suma el portal del trabajador si la persona dueña del documento firmó", () => {
    expect(visibleParaFirmante([], persona, [{ personaId: null }, { personaId: "p1" }])).toEqual([
      "trabajador",
    ]);
    expect(visibleParaFirmante(["cliente"], persona, [{ personaId: "p1" }])).toEqual([
      "cliente",
      "trabajador",
    ]);
  });

  it("no lo duplica si ya estaba visible", () => {
    expect(visibleParaFirmante(["trabajador"], persona, [{ personaId: "p1" }])).toEqual([
      "trabajador",
    ]);
  });

  it("no cambia nada si firmó otra persona, si no hay dueño o si el dueño no es una persona", () => {
    expect(visibleParaFirmante([], persona, [{ personaId: "p2" }])).toEqual([]);
    expect(visibleParaFirmante([], null, [{ personaId: "p1" }])).toEqual([]);
    expect(
      visibleParaFirmante([], { entidadTipo: "cuenta", entidadId: "p1" }, [{ personaId: "p1" }]),
    ).toEqual([]);
  });
});
