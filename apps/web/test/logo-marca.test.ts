import { describe, expect, it } from "vitest";

import { logoDeMarca } from "@/app/_components/logo-marca";

// Logo de la empresa en el menú del diseño nuevo (CAR-335 D6b): sale de `core.marca.get`.
describe("logo de la marca para el menú", () => {
  it("prefiere el isotipo y, si no hay, el logo principal", () => {
    expect(logoDeMarca({ urls: { isotipoId: "/i", logoPrincipalId: "/p" } })).toBe("/i");
    expect(logoDeMarca({ urls: { logoPrincipalId: "/p" } })).toBe("/p");
  });

  it("sin logos o sin datos no hay logo (queda la inicial con el color)", () => {
    expect(logoDeMarca({ urls: {} })).toBeUndefined();
    expect(logoDeMarca(null)).toBeUndefined();
    expect(logoDeMarca({ colorPrimario: "#000" })).toBeUndefined();
  });
});
