import { describe, expect, it } from "vitest";

import { normalizarNombre } from "./index";

describe("comercial · dominio", () => {
  it("normaliza espacios", () => {
    expect(normalizarNombre("  María   Soto ")).toBe("María Soto");
  });
});
