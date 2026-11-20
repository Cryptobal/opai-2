// CAR-528: en «ver como» los controles que guardan se ven, pero desactivados; fuera de la vista, no.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DesactivarEnVista, SoloLecturaVerComo } from "@/app/_components/ver-como/solo-lectura";

const boton = createElement("button", { type: "button" }, "Guardar");
const desactivado = (html: string) => /<fieldset[^>]*disabled/.test(html);

describe("DesactivarEnVista", () => {
  it("dentro de «ver como» desactiva el contenido y lo deja visible", () => {
    const html = renderToStaticMarkup(
      createElement(SoloLecturaVerComo, null, createElement(DesactivarEnVista, null, boton)),
    );
    expect(desactivado(html)).toBe(true);
    expect(html).toContain("Guardar");
  });

  it("fuera de la vista no desactiva nada", () => {
    expect(desactivado(renderToStaticMarkup(createElement(DesactivarEnVista, null, boton)))).toBe(
      false,
    );
  });
});
