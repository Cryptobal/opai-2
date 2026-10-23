import { describe, expect, it } from "vitest";

import { normalizarNombre } from "./index";

describe("__ID__ · dominio", () => {
  it("normaliza espacios", () => {
    expect(normalizarNombre("  María   Soto ")).toBe("María Soto");
  });
});
