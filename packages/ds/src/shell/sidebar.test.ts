import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Sidebar } from "./sidebar";

// Marcado del servidor de la barra lateral de escritorio (ShellDesktop.html): marca con su texto al lado.
const base = {
  items: [],
  rutaActual: "/trabajador",
  portales: [{ id: "trabajador", etiqueta: "Trabajador", href: "/trabajador" }],
  portalActual: "trabajador",
};

describe("Sidebar", () => {
  it("muestra el subtítulo del portal junto a «OPAI»", () => {
    const html = renderToStaticMarkup(createElement(Sidebar, { ...base, subtitulo: "Trabajador" }));
    expect(html).toMatch(/>OPAI<\/span><span class="t-caption[^"]*">Trabajador<\/span>/);
  });

  it("sin subtítulo (ERP) lleva «2.0», como el diseño", () => {
    const html = renderToStaticMarkup(createElement(Sidebar, base));
    expect(html).toMatch(/>OPAI<\/span><span class="t-caption[^"]*">2\.0<\/span>/);
  });

  it("lleva al usuario al pie, con su menú", () => {
    const html = renderToStaticMarkup(
      createElement(Sidebar, {
        ...base,
        usuario: { nombre: "Carlos Irigoyen", rol: "Administrador" },
        menuUsuario: [{ id: "salir", etiqueta: "Salir", onSelect: () => undefined }],
      }),
    );
    expect(html).toContain("Carlos Irigoyen");
    expect(html).toContain("Administrador");
  });
});
