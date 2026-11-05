import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BloquePlegable } from "@opai/ds";

const html = (resumen?: string) =>
  renderToStaticMarkup(createElement(BloquePlegable, { paso: 2, titulo: "Puestos", children: "x", ...(resumen ? { resumen } : {}) }));

describe("resumen del paso en teléfono (CAR-192)", () => {
  it("el resumen sale también en una segunda línea visible bajo 640 px", () => {
    const h = html("2 puestos");
    expect(h).toMatch(/class="[^"]*sm:hidden[^"]*"[^>]*data-resumen-telefono[^>]*>2 puestos/);
    expect(h).toMatch(/hidden[^"]*sm:inline[^>]*>2 puestos/);
  });
  it("sin resumen no agrega la línea", () => {
    expect(html()).not.toContain("data-resumen-telefono");
  });
});
