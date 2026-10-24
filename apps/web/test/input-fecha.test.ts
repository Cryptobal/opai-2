import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { InputFecha } from "@opai/ds";

const html = () =>
  renderToStaticMarkup(createElement(InputFecha, { valor: "2026-10-24", onCambiar: () => {} }));

describe("InputFecha: calendario propio es-CL", () => {
  it("el icono es un botón de 44 px que abre el calendario del DS, sin selector nativo", () => {
    const h = html();
    expect(h).toContain('aria-label="Abrir calendario"');
    expect(h).toContain("ds-btn-calendario");
    expect(h).not.toContain('type="date"');
  });

  it("el campo de texto sigue siendo dd-mm-aaaa y no se muestra el calendario cerrado", () => {
    const h = html();
    expect(h).toContain('placeholder="dd-mm-aaaa"');
    expect(h).toContain('value="24-10-2026"');
    expect(h).not.toContain("Elegir fecha");
  });
});
