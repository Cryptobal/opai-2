import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Cabecera, Estado } from "./estado";

const h2 = (html: string) => html.match(/<h2[^>]*>/)?.[0] ?? "";

describe("Cabecera de página", () => {
  it("sin tituloSiempre el título solo se ve en teléfono (la barra del shell lo trae en md+)", () => {
    expect(h2(renderToStaticMarkup(<Cabecera titulo="Cuentas" />))).toContain("md:hidden");
  });
  it("con tituloSiempre el título también se ve en md+", () => {
    expect(h2(renderToStaticMarkup(<Cabecera titulo="R-102" tituloSiempre />))).not.toContain(
      "md:hidden",
    );
  });
});

describe("estados de una lista (CAR-340)", () => {
  const html = (state: "empty" | "error" | "forbidden" | "ready") =>
    renderToStaticMarkup(
      <Estado state={state} variante="lista" textos={{ vacio: { titulo: "Aún no hay contactos" } }}>
        <ul data-filas="" />
      </Estado>,
    );
  it("vacío, error y sin permiso llevan margen y no quedan pegados al borde", () => {
    for (const s of ["empty", "error", "forbidden"] as const)
      expect(html(s)).toMatch(/^<div[^>]*data-estado-lista=""[^>]*class="[^"]*\bp-4\b/);
  });
  it("con datos, las filas siguen de borde a borde", () => {
    expect(html("ready")).toBe('<ul data-filas=""></ul>');
  });
});
