import { describe, expect, it } from "vitest";

import { CODIGOS_REFERENCIA_SII, esReferenciaSii, etiquetaReferenciaSii, validarReferenciaSii } from "./referencias-sii";

describe("referencias SII (CAR-221 · A1)", () => {
  it("el catálogo es cerrado: 801, 802, 803, 804 y 52", () => {
    expect([...CODIGOS_REFERENCIA_SII].sort((a, b) => a - b)).toEqual([52, 801, 802, 803, 804]);
    expect(esReferenciaSii(801)).toBe(true);
    expect(esReferenciaSii(33)).toBe(false);
    expect(etiquetaReferenciaSii(802)).toContain("HES");
  });

  it("valida código, folio y fecha", () => {
    const ok = { codigo: 801, folio: 4500, fecha: "2026-10-15" };
    expect(validarReferenciaSii(ok, "2026-11-07")).toBeNull();
    expect(validarReferenciaSii({ ...ok, codigo: 99 }, "2026-11-07")).toMatch(/catálogo/);
    expect(validarReferenciaSii({ ...ok, folio: 0 }, "2026-11-07")).toMatch(/folio/);
    expect(validarReferenciaSii({ ...ok, fecha: "15-10-2026" }, "2026-11-07")).toMatch(/fecha/);
    expect(validarReferenciaSii({ ...ok, fecha: "2026-02-31x" }, "2026-11-07")).toMatch(/fecha/);
    expect(validarReferenciaSii({ ...ok, fecha: "2026-12-01" }, "2026-11-07")).toMatch(/posterior/);
  });
});
