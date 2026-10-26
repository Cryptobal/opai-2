import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Button } from "./button";

// Marcado del servidor del Button en carga (ADR-050, hallazgo #54-1): el texto se oculta sin usar
// `display:contents` (que no acepta `opacity`), conserva su caja y sigue siendo el nombre accesible.
// El ocultamiento efectivo a la vista se mide en el navegador en apps/web/e2e/ds-v2.spec.ts.

describe("Button", () => {
  it("en carga queda ocupado y deshabilitado", () => {
    const html = renderToStaticMarkup(
      createElement(Button, { cargando: true, children: "Guardar cambios" }),
    );
    expect(html).toMatch(/aria-busy="true"/);
    expect(html).toMatch(/<button[^>]*disabled=""/);
  });

  it("en carga oculta el texto con opacidad 0, no con display:contents", () => {
    const html = renderToStaticMarkup(
      createElement(Button, { cargando: true, children: "Guardar cambios" }),
    );
    // La caja del texto se mantiene (inline-flex) y se oculta con opacity-0; nunca `contents`.
    expect(html).toContain('<span class="inline-flex items-center gap-2 opacity-0">');
    expect(html).not.toContain("contents");
  });

  it("en carga conserva el texto como nombre accesible y el spinner queda oculto al lector", () => {
    const html = renderToStaticMarkup(
      createElement(Button, { cargando: true, children: "Guardar cambios" }),
    );
    // opacity-0 no saca el texto del árbol accesible (a diferencia de visibility:hidden o display:none).
    expect(html).toContain(">Guardar cambios</span>");
    expect(html).toMatch(/<span aria-hidden[^>]*class="[^"]*ds-spinner/);
  });

  it("sin carga no deshabilita ni envuelve el texto", () => {
    const html = renderToStaticMarkup(createElement(Button, { children: "Enviar" }));
    expect(html).not.toContain("aria-busy");
    expect(html).not.toContain("ds-spinner");
    expect(html).not.toContain("opacity-0");
    expect(html).toContain(">Enviar</button>");
  });
});
