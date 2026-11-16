import { describe, expect, it } from "vitest";

import { elegirCadena, pasosSimultaneos, siguientePaso } from "./cadena";

const I = "inst-1";

describe("elegirCadena", () => {
  const cadenas = [
    { id: "empresa", instalacionId: null, severidad: null },
    { id: "empresa-alta", instalacionId: null, severidad: "alta" },
    { id: "inst", instalacionId: I, severidad: null },
    { id: "otra-inst", instalacionId: "inst-2", severidad: null },
  ];
  it("gana la más específica que calza", () => {
    expect(elegirCadena(cadenas, I, "alta")?.id).toBe("inst");
    expect(elegirCadena(cadenas, "inst-3", "alta")?.id).toBe("empresa-alta");
    expect(elegirCadena(cadenas, "inst-3", "baja")?.id).toBe("empresa");
  });
  it("sin cadenas que calcen devuelve null (se usa la plantilla)", () => {
    expect(elegirCadena([{ instalacionId: "x", severidad: null }], I, "baja")).toBeNull();
  });
});

describe("pasos", () => {
  it("en una crítica el paso 2 contacta también al 3", () => {
    expect(pasosSimultaneos(2, 4, "critica")).toEqual([2, 3]);
    expect(pasosSimultaneos(2, 4, "alta")).toEqual([2]);
    expect(siguientePaso(2, 4, "critica")).toBe(4);
    expect(siguientePaso(2, 4, "alta")).toBe(3);
  });
  it("después del último no hay siguiente", () => {
    expect(siguientePaso(4, 4, "media")).toBeNull();
    expect(siguientePaso(1, 1, "critica")).toBeNull();
  });
});
