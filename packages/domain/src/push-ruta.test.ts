import { describe, expect, it } from "vitest";

import { rutaPushInterna } from "./push-ruta";

describe("rutaPushInterna", () => {
  it("acepta rutas internas simples", () => {
    expect(rutaPushInterna("/trabajador/pauta")).toBe("/trabajador/pauta");
  });

  it("rechaza esquema, host, doble barra y path traversal", () => {
    expect(rutaPushInterna("https://evil/a")).toBe("/bandeja");
    expect(rutaPushInterna("//evil")).toBe("/bandeja");
    expect(rutaPushInterna("/../admin")).toBe("/bandeja");
  });
});