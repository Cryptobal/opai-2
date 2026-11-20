import { describe, expect, it } from "vitest";

import { REGIONES_CHILE } from "./regiones-chile";

describe("REGIONES_CHILE", () => {
  it("tiene las 16 regiones sin duplicados", () => {
    expect(REGIONES_CHILE).toHaveLength(16);
    expect(new Set(REGIONES_CHILE).size).toBe(16);
  });
});