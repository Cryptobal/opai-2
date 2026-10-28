import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { iconoShell } from "@/app/_components/icono-shell";

describe("SVG de navegación renderizado por el servidor", () => {
  it("conserva el trazado y aplica tamaño, acento y semántica del DS sin mutar el original", () => {
    // Así recibe el cliente el elemento después de resolver el Server Component.
    const svg = createElement("svg", { viewBox: "0 0 24 24", className: "original" },
      createElement("path", { d: "M1 2h3" }));
    const Icono = iconoShell("Home", { Home: svg });
    const html = renderToStaticMarkup(createElement(Icono, { className: "size-4 text-accent", "aria-hidden": true }));
    expect(html).toContain('d="M1 2h3"');
    expect(html).toContain('viewBox="0 0 24 24"');
    expect(html).toContain('class="size-4 text-accent"');
    expect(html).toContain('aria-hidden="true"');
    expect(svg.props.className).toBe("original");
  });

  it("usa LayoutGrid si falta el SVG, sin necesitar el catálogo completo", () => {
    const html = renderToStaticMarkup(createElement(iconoShell("desconocido"), { className: "size-5" }));
    expect(html).toContain("lucide-layout-grid");
    expect(html).toContain("size-5");
  });
});
