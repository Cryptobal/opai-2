import { describe, expect, it } from "vitest";

import { AREAS_NAV, esAreaNav, ETIQUETA_AREA } from "./navegacion";

describe("esAreaNav", () => {
  it("acepta las áreas de la lista cerrada de R1", () => {
    for (const area of AREAS_NAV) expect(esAreaNav(area)).toBe(true);
  });

  it("rechaza lo que no está en la lista (p. ej. 'configuracion', que no es área)", () => {
    expect(esAreaNav("configuracion")).toBe(false);
    expect(esAreaNav("maestros")).toBe(false);
  });

  it("tiene una etiqueta para cada área", () => {
    for (const area of AREAS_NAV) expect(ETIQUETA_AREA[area]).toBeTruthy();
  });
});
