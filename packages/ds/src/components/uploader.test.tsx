import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Uploader } from "./uploader";

// CAR-364: en el teléfono la zona de arrastre (el `label` del campo) se oculta; el campo de archivo
// conserva su nombre accesible (axe `label`).
describe("Uploader", () => {
  it("el campo de archivo tiene nombre aunque la zona de arrastre no se vea", () => {
    const html = renderToStaticMarkup(
      <Uploader procesar={async () => undefined} etiquetaBoton="Elegir planilla" />,
    );
    expect(html).toMatch(/<input[^>]*type="file"[^>]*aria-label="Elegir planilla"/);
  });
});
