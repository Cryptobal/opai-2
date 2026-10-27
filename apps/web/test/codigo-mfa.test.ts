import { describe, expect, it } from "vitest";

import { normalizarCodigoRespaldo } from "../lib/codigo-mfa";

describe("normalización del código de respaldo", () => {
  it.each([
    ["aB3dE-fG7hI", "aB3dE-fG7hI"],
    ["aB3dEfG7hI", "aB3dE-fG7hI"],
    [" aB3 dE - fG7 hI\n", "aB3dE-fG7hI"],
    ["Ab3DeFg7Hi", "Ab3De-Fg7Hi"],
    ["aB3-dEfG7hI", "aB3-dEfG7hI"],
  ])("normaliza %s sin alterar el caso ni guiones inválidos", (entrada, esperado) => {
    expect(normalizarCodigoRespaldo(entrada)).toBe(esperado);
  });
});
