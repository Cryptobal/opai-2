import { describe, expect, it } from "vitest";

import { vigenciaLista } from "../src/acceso/listas-alcance";

describe("vigenciaLista", () => {
  it("bloqueo sin fecha de término no asigna vigenteHasta (no vence por defecto)", () => {
    expect(vigenciaLista("bloqueada", "2020-01-15")).toEqual({
      vigenteDesde: new Date("2020-01-15"),
      vigenteHasta: null,
    });
    expect(vigenciaLista("bloqueada")).toEqual({
      vigenteDesde: null,
      vigenteHasta: null,
    });
  });

  it("respeta vigenteHasta explícito en bloqueos", () => {
    expect(vigenciaLista("bloqueada", "2020-01-15", "2025-12-31")).toEqual({
      vigenteDesde: new Date("2020-01-15"),
      vigenteHasta: new Date("2025-12-31"),
    });
  });
});