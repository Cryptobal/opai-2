import { describe, expect, it } from "vitest";

import { etiquetaBasePlantillaCpq } from "@/lib/cpq-plantilla-presentacion";

describe("cpq-plantilla-presentacion", () => {
  it("segunda base visible es Moderna, no Ejecutiva", () => {
    expect(etiquetaBasePlantillaCpq("ejecutiva")).toBe("Moderna");
    expect(etiquetaBasePlantillaCpq("clasica")).toBe("Clásica");
    expect(etiquetaBasePlantillaCpq("compacta")).toBe("Compacta");
  });
});
