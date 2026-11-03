import { describe, expect, it } from "vitest";

import {
  fechaDisplay,
  hoyCivil,
  pctDisplay,
  resumenIndicador,
  ufCentavosDisplay,
} from "../src/core/remuneraciones/formato";

describe("formato remuneraciones", () => {
  it("formatea pesos, UF y porcentajes", () => {
    expect(ufCentavosDisplay(4_123_701)).toBe("$ 41.237,01");
    expect(resumenIndicador("imm", 553_553)).toBe("$ 553.553");
    expect(resumenIndicador("utm", 72_151)).toBe("$ 72.151");
    expect(resumenIndicador("sis", 17_800)).toBe("1,78 %");
    expect(resumenIndicador("jornada", 42)).toBe("42 h");
  });

  it("fechaDisplay invierte ISO civil", () => {
    expect(fechaDisplay("2026-11-02")).toBe("02-11-2026");
  });

  it("pctDisplay usa coma decimal", () => {
    expect(pctDisplay(2_700)).toBe("0,27 %");
  });

  it("hoyCivil devuelve ISO", () => {
    expect(hoyCivil()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
