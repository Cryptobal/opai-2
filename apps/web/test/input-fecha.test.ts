import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { InputFecha } from "@opai/ds";

const html = () =>
  renderToStaticMarkup(createElement(InputFecha, { valor: "2026-10-24", onCambiar: () => {} }));

describe("InputFecha: el calendario se abre desde el icono y desde el campo", () => {
  it("el icono es el selector nativo de 44 px encima, no un botón que dependa de showPicker", () => {
    const h = html();
    expect(h).toContain('type="date"');
    expect(h).toContain('aria-label="Abrir calendario"');
    expect(h).toContain("ds-btn-calendario");
    expect(h).toContain("ds-selector-total");
    expect(h).not.toContain("<button");
  });

  it("el campo de texto sigue siendo dd-mm-aaaa", () => {
    const h = html();
    expect(h).toContain('placeholder="dd-mm-aaaa"');
    expect(h).toContain('value="24-10-2026"');
  });
});
