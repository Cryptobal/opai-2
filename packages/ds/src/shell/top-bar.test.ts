import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AppBar, TopBarTelefono } from "./top-bar";

const base = {
  portales: [{ id: "erp", etiqueta: "ERP", href: "/" }],
  portalActual: "erp",
  titulo: "Inicio",
};
const campana = createElement("i", { "data-t": "campana" });
const agente = createElement("i", { "data-t": "agente" });

describe("agente en la barra superior (D11)", () => {
  it.each([
    ["teléfono", TopBarTelefono],
    ["iPad y desktop", AppBar],
  ] as const)("%s: el agente va a la izquierda de la campana", (_n, Barra) => {
    const html = renderToStaticMarkup(createElement(Barra, { ...base, campana, agente }));
    expect(html.indexOf('data-t="agente"')).toBeGreaterThan(-1);
    expect(html.indexOf('data-t="agente"')).toBeLessThan(html.indexOf('data-t="campana"'));
  });
  it.each([
    ["teléfono", TopBarTelefono],
    ["iPad y desktop", AppBar],
  ] as const)("%s: sin agente no hay ningún botón de agente", (_n, Barra) => {
    const html = renderToStaticMarkup(createElement(Barra, { ...base, campana }));
    expect(html).not.toContain('data-t="agente"');
  });
});
