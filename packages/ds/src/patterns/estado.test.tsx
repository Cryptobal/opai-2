import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Cabecera } from "./estado";

const h2 = (html: string) => html.match(/<h2[^>]*>/)?.[0] ?? "";

describe("Cabecera de página", () => {
  it("el título del shell se oculta dentro del marco Hilo, que ya lo muestra en el lienzo", () => {
    expect(h2(renderToStaticMarkup(<Cabecera titulo="Cuentas" />))).toContain("marco-hilo:hidden");
  });
  it("un título propio (tituloSiempre) se ve en los dos marcos", () => {
    expect(h2(renderToStaticMarkup(<Cabecera titulo="R-102" tituloSiempre />))).not.toContain(
      "marco-hilo:hidden",
    );
  });
  it("con tituloComoShell se ve en el clásico y se oculta en Hilo, sin repetir el del lienzo (CAR-317)", () => {
    const t = h2(
      renderToStaticMarkup(<Cabecera titulo="Preferencias" tituloSiempre tituloComoShell />),
    );
    expect(t).toContain("marco-hilo:hidden");
    expect(t).not.toContain("md:hidden");
  });
});
