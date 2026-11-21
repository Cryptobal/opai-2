import { describe, expect, it } from "vitest";

import { diasVacacionesAcumulados } from "./vacaciones-proporcional";

describe("diasVacacionesAcumulados", () => {
  it("proporciona quince días por doce meses", () => {
    expect(diasVacacionesAcumulados(12)).toBe(15);
    expect(diasVacacionesAcumulados(48)).toBe(60);
  });

  it("devuelve cero sin servicio", () => {
    expect(diasVacacionesAcumulados(0)).toBe(0);
  });
});