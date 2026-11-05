import { describe, expect, it } from "vitest";

import { avisoSemanalEn, limiteSemanalEn } from "./jornada-legal";

describe("jornada legal con vigencia (Ley 21.561)", () => {
  it.each([
    ["2024-04-25", 45],
    ["2024-04-26", 44],
    ["2026-04-25", 44],
    ["2026-04-26", 42],
    ["2028-04-25", 42],
    ["2028-04-26", 40],
    ["2031-01-01", 40],
  ])("%s → %i h", (fecha, horas) => expect(limiteSemanalEn(fecha)).toBe(horas));

  it("el aviso va 2 h bajo el tope vigente", () => {
    expect(avisoSemanalEn("2026-10-01")).toBe(40);
    expect(avisoSemanalEn("2028-10-01")).toBe(38);
  });

  it("una tabla de la empresa reemplaza la de fábrica", () => {
    expect(limiteSemanalEn("2026-10-01", [{ desde: "2026-01-01", horas: 36 }])).toBe(36);
  });
});
