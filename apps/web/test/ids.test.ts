import { describe, expect, it } from "vitest";

import { esUuid, requerirUuid } from "@/lib/ids";

describe("ids de rutas [id]", () => {
  it("reconoce UUID v4 y v7", () => {
    expect(esUuid("01a166f3-ce42-72d8-a664-77755f23606c")).toBe(true);
    expect(esUuid("3f2b8c1e-9d4a-4e7b-8a1c-2b6d5e9f0a13")).toBe(true);
  });

  it("'nueva' y otras palabras no son ids: 404 en vez de «No pudimos cargar»", () => {
    for (const id of ["nueva", "nuevo", "vencimientos", "123", "", "01a166f3-ce42-72d8-a664"]) {
      expect(esUuid(id), id).toBe(false);
      expect(() => requerirUuid(id), id).toThrow();
    }
  });

  it("un UUID válido pasa sin cambios", () => {
    const id = "01a166f3-ce42-72d8-a664-77755f23606c";
    expect(requerirUuid(id)).toBe(id);
  });
});
