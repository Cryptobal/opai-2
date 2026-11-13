import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SplitScreen } from "./split-screen";

describe("SplitScreen · marcas para el diseño nuevo (CAR-336)", () => {
  it("sin detalle se marca para que la lista use todo el ancho", () => {
    const html = renderToStaticMarkup(<SplitScreen telefono="lista" lista={<p>lista</p>} />);
    expect(html).toContain("data-sin-detalle");
    expect(html).toContain('data-columna="lista"');
  });

  it("con detalle no lleva la marca; Configuración se distingue", () => {
    const con = renderToStaticMarkup(
      <SplitScreen telefono="detalle" lista={<p>lista</p>} detalle={<p>ficha</p>} />,
    );
    expect(con).not.toContain("data-sin-detalle");
    expect(con).toContain('data-columna="detalle"');
    const config = renderToStaticMarkup(
      <SplitScreen telefono="lista" contenido lista={<p>x</p>} />,
    );
    expect(config).toContain("data-contenido");
  });

  it("con ficha trae «Ver a pantalla completa» (CAR-335 D4b); sin ficha ni en Configuración, no", () => {
    const con = renderToStaticMarkup(
      <SplitScreen telefono="detalle" lista={<p>lista</p>} detalle={<p>ficha</p>} />,
    );
    expect(con).toContain("data-expandir-ficha");
    expect(con).toContain('type="checkbox"');
    expect(con).toContain("Ver a pantalla completa");
    expect(con).toContain("Volver a ver la lista");
    const sin = renderToStaticMarkup(<SplitScreen telefono="lista" lista={<p>lista</p>} />);
    expect(sin).not.toContain("data-expandir-ficha");
    const config = renderToStaticMarkup(
      <SplitScreen telefono="detalle" contenido lista={<p>x</p>} detalle={<p>y</p>} />,
    );
    expect(config).not.toContain("data-expandir-ficha");
  });
});
