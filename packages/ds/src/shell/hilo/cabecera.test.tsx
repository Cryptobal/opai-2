import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CabeceraHilo } from "./cabecera";

const Link = (p: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...p} />;
const nada = () => undefined;

const html = () =>
  renderToStaticMarkup(
    <CabeceraHilo
      monograma="G"
      sujeto="Gard Security"
      sujetoSub="ERP · Camilo Ibarra"
      inicioHref="/"
      onPortales={nada}
      onInicio={nada}
      onIndice={nada}
      onTema={nada}
      Link={Link}
    />,
  );

// Maqueta corregida a pedido de Carlos (11-nov-2026, CAR-317): sin botón «Portales» aparte.
describe("Cabecera del hilo", () => {
  it("la identidad es el selector de portal y empresa, sin un botón «Portales» aparte", () => {
    const h = html();
    expect(h).not.toMatch(/<span>Portales<\/span>/);
    expect(h).toContain(
      'aria-label="Gard Security, ERP · Camilo Ibarra. Cambiar de portal o de empresa"',
    );
    expect(h).toContain('data-icono="selector"');
  });
  it("el tema queda a la vista desde 1024 px, no recién desde 1400 px", () => {
    const tema = html().match(
      /<button[^>]*aria-label="Cambiar entre tema claro y oscuro"[^>]*>/,
    )?.[0];
    expect(tema).toBeDefined();
    expect(tema).toContain("lg:inline-flex");
    expect(tema).not.toContain("hilo:inline-flex");
  });
});
