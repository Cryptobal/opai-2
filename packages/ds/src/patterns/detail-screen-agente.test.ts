import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DetailScreen } from "./detail-screen";

// CAR-335 D5: la ficha deja una ranura bajo la cabecera para el agente («Preguntar a OPAI»).
describe("ranura del agente en la ficha", () => {
  it("la ficha marca su raíz y deja la ranura entre la cabecera y el contenido", () => {
    const html = renderToStaticMarkup(
      createElement(DetailScreen, { titulo: "Cuenta", state: "ok" }, "contenido"),
    );
    expect(html).toContain("data-detalle");
    const ranura = html.indexOf("data-ficha-agente");
    expect(ranura).toBeGreaterThan(html.indexOf("Cuenta"));
    expect(ranura).toBeLessThan(html.indexOf("contenido"));
  });
});
