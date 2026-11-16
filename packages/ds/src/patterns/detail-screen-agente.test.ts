import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DetailScreen } from "./detail-screen";

// CAR-547: el agente ya no vive dentro de la ficha; solo el panel lateral.
describe("detalle sin ranura de agente", () => {
  it("la ficha marca su raíz y no reserva hueco bajo la cabecera", () => {
    const html = renderToStaticMarkup(
      createElement(DetailScreen, { titulo: "Cuenta", state: "ready" }, "contenido"),
    );
    expect(html).toContain("data-detalle");
    expect(html).not.toContain("data-ficha-agente");
  });
});