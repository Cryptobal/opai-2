import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PortalSwitcher } from "../shell/portal-switcher";
import { Monograma } from "./avatar";

// Logo de la empresa en el menú (ADR-109, CAR-335 D6b): con logo se ve la imagen; sin logo, la
// inicial, que la piel nueva pinta con el color de la empresa (`data-monograma` en styles.css).
describe("monograma de la empresa", () => {
  it("sin logo muestra las iniciales", () => {
    const html = renderToStaticMarkup(createElement(Monograma, { nombre: "Gard Security" }));
    expect(html).toContain("GS");
    expect(html).toContain("data-monograma");
    expect(html).not.toContain("<img");
  });

  it("con logo muestra la imagen, decorativa, y no las iniciales", () => {
    const html = renderToStaticMarkup(
      createElement(Monograma, { nombre: "Gard Security", logo: "/api/marca/gard/isotipo" }),
    );
    expect(html).toContain('src="/api/marca/gard/isotipo"');
    expect(html).toContain('alt=""');
    expect(html).not.toContain("GS");
  });

  it("el selector de portal usa el logo de la empresa", () => {
    const html = renderToStaticMarkup(
      createElement(PortalSwitcher, {
        portales: [{ id: "erp", etiqueta: "ERP", href: "/" }],
        portalActual: "erp",
        tenant: { nombre: "Gard Security", logo: "/api/marca/gard/isotipo" },
        variante: "riel",
      }),
    );
    expect(html).toContain('src="/api/marca/gard/isotipo"');
  });
});
