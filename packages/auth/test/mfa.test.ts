import { describe, expect, it } from "vitest";

import { pideSegundoFactor } from "@opai/domain";

/** Detección del desafío de segundo factor en la respuesta de `signInEmail` (NÚCLEO-F). */
describe("pideSegundoFactor", () => {
  it("es verdadero solo cuando la respuesta trae twoFactorRedirect: true", () => {
    expect(pideSegundoFactor({ twoFactorRedirect: true, twoFactorMethods: ["totp"] })).toBe(true);
  });

  it("es falso para un login normal (token/usuario) o respuestas sin la marca", () => {
    expect(pideSegundoFactor({ token: "abc", user: { id: "u1" } })).toBe(false);
    expect(pideSegundoFactor({ twoFactorRedirect: false })).toBe(false);
    expect(pideSegundoFactor({})).toBe(false);
    expect(pideSegundoFactor(null)).toBe(false);
    expect(pideSegundoFactor("x")).toBe(false);
  });
});
