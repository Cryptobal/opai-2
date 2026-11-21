import { describe, expect, it } from "vitest";

import { errorDeDestino, errorDeDestinoResuelto } from ".";

describe("inventario · entregas (CAR-238, CAR-487)", () => {
  it("R19: hace falta al menos persona o instalación", () => {
    expect(errorDeDestino({})).toMatch(/Elige/);
    expect(errorDeDestino({ personaId: "a" })).toBeNull();
    expect(errorDeDestino({ instalacionId: "b" })).toBeNull();
    expect(errorDeDestino({ personaId: "a", instalacionId: "b" })).toBeNull();
  });

  it("CAR-487: persona con instalación de imputación", () => {
    expect(errorDeDestinoResuelto({ personaId: "a", instalacionId: "b" })).toBeNull();
    expect(errorDeDestinoResuelto({ personaId: "a", instalacionId: null })).toMatch(/imputación/);
    expect(errorDeDestinoResuelto({ personaId: null, instalacionId: "b" })).toBeNull();
  });
});
