import { describe, expect, it } from "vitest";

import { errorDeDestino } from ".";

describe("inventario · entregas (CAR-238)", () => {
  it("R19: exactamente una persona o una instalación", () => {
    expect(errorDeDestino({})).toMatch(/Elige/);
    expect(errorDeDestino({ personaId: "a", instalacionId: "b" })).toMatch(/no a las dos/);
    expect(errorDeDestino({ personaId: "a" })).toBeNull();
    expect(errorDeDestino({ instalacionId: "b" })).toBeNull();
  });
});
