import { describe, expect, it } from "vitest";

import { diasPrerregistro, estadoDiaPrerregistro, validarRangoPrerregistro } from "./prerregistro";

describe("prerregistro (R14, R15)", () => {
  it("lista cada día del rango, ambos extremos incluidos", () => {
    expect(diasPrerregistro("2026-11-30", "2026-12-02")).toEqual([
      "2026-11-30",
      "2026-12-01",
      "2026-12-02",
    ]);
    expect(diasPrerregistro("2026-11-30", "2026-11-30")).toEqual(["2026-11-30"]);
  });

  it("no acepta rangos de más de 30 días, al revés ni en el pasado", () => {
    expect(validarRangoPrerregistro("2026-11-14", "2026-12-13", "2026-11-14")).toBeNull();
    expect(validarRangoPrerregistro("2026-11-14", "2026-12-14", "2026-11-14")).toMatch(/30 días/);
    expect(validarRangoPrerregistro("2026-11-15", "2026-11-14", "2026-11-14")).toMatch(/antes/);
    expect(validarRangoPrerregistro("2026-11-13", "2026-11-14", "2026-11-14")).toMatch(/pasó/);
  });

  it("estado por día: pendiente, no llegó al terminar el día, cancelado", () => {
    expect(estadoDiaPrerregistro({ dia: "2026-11-14", hoy: "2026-11-14", cancelado: false })).toBe(
      "pendiente",
    );
    expect(estadoDiaPrerregistro({ dia: "2026-11-13", hoy: "2026-11-14", cancelado: false })).toBe(
      "no_llego",
    );
    expect(estadoDiaPrerregistro({ dia: "2026-11-20", hoy: "2026-11-14", cancelado: true })).toBe(
      "cancelado",
    );
  });
});
