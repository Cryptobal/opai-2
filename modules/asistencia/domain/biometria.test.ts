import { describe, expect, it } from "vitest";

import { debeSuprimirse, motivoRespaldoValido, PROPOSITOS, TEXTO_CONSENTIMIENTO } from "./biometria";

describe("respaldo y supresión", () => {
  it("el motivo de respaldo debe ser conocido", () => {
    expect(motivoRespaldoValido("vida_fallida")).toBe(true);
    expect(motivoRespaldoValido("porque sí")).toBe(false);
    expect(motivoRespaldoValido(undefined)).toBe(false);
  });
  it("se suprime solo si no queda ningún vínculo vigente", () => {
    expect(debeSuprimirse([{ estado: "terminado" }])).toBe(true);
    expect(debeSuprimirse([{ estado: "terminado" }, { estado: "vigente" }])).toBe(false);
    expect(debeSuprimirse([])).toBe(false);
  });
  it("cada finalidad tiene su texto", () => {
    for (const p of PROPOSITOS) expect(TEXTO_CONSENTIMIENTO[p].length).toBeGreaterThan(50);
  });
});
