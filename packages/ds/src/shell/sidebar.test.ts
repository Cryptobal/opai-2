import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Sidebar } from "./sidebar";

// Marcado del servidor de la barra lateral de escritorio: el subtítulo del portal va bajo la marca.
const base = {
  items: [],
  rutaActual: "/trabajador",
  portales: [{ id: "trabajador", etiqueta: "Trabajador", href: "/trabajador" }],
  portalActual: "trabajador",
};

describe("Sidebar", () => {
  it("muestra el nombre del portal bajo «OPAI»", () => {
    const html = renderToStaticMarkup(createElement(Sidebar, { ...base, subtitulo: "Trabajador" }));
    expect(html).toMatch(/>OPAI<\/span><span class="t-caption[^"]*">Trabajador<\/span>/);
  });

  it("sin subtítulo (ERP) solo lleva la marca", () => {
    const html = renderToStaticMarkup(createElement(Sidebar, base));
    expect(html).toContain(">OPAI</span>");
    expect(html).not.toContain("t-caption");
  });
});
