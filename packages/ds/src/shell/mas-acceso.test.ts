import { Users } from "lucide-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { baldosasDeAcceso, RecientesMas } from "./mas-acceso";

const a = { href: "/a", etiqueta: "Alfa", icono: Users };
const b = { href: "/b", etiqueta: "Beta" };
const c = { href: "/c", etiqueta: "Gamma" };
const d = { href: "/d", etiqueta: "Delta" };
const e = { href: "/e", etiqueta: "Épsilon" };

describe("baldosasDeAcceso", () => {
  it("pone los fijados primero y no repite rutas", () => {
    expect(baldosasDeAcceso([a], [b, { ...a, etiqueta: "Alfa 2" }, c]).map((i) => i.href)).toEqual([
      "/a",
      "/b",
      "/c",
    ]);
  });
  it("corta en cuatro baldosas", () => {
    expect(baldosasDeAcceso([a, b], [c, d, e])).toHaveLength(4);
  });
  it("sin fijados ni recientes queda vacío", () => {
    expect(baldosasDeAcceso([], [])).toEqual([]);
  });
});

describe("Más: fijados y recientes", () => {
  it("la fila trae su título y una baldosa por entrada", () => {
    const html = renderToStaticMarkup(
      createElement(RecientesMas, { items: [a, b], onNavegar: () => undefined }),
    );
    expect(html).toContain("Fijados y recientes");
    expect(html).toContain("Alfa");
    expect(html).toContain("Beta");
    expect(html.match(/<a /g)).toHaveLength(2);
    expect(html).toContain("overflow-x-auto");
  });
  it("sin entradas muestra la ayuda y ninguna cuadrícula", () => {
    const html = renderToStaticMarkup(
      createElement(RecientesMas, { items: [], onNavegar: () => undefined }),
    );
    expect(html).toContain("Aquí aparecen las páginas que visitas y las que fijas.");
    expect(html).not.toContain("<ul");
  });
  it("con error ofrece reintentar", () => {
    const html = renderToStaticMarkup(
      createElement(RecientesMas, { items: [], onNavegar: () => undefined, error: true }),
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("Reintentar");
  });
});

describe("Más: fijados marcados con pin", () => {
  it("el fijado lleva pin y el reciente no", () => {
    const html = renderToStaticMarkup(
      createElement(RecientesMas, { items: [a, b], onNavegar: () => undefined, fijados: new Set(["/a"]) }),
    );
    expect(html.match(/aria-label="Fijado"/g)).toHaveLength(1);
  });
});

describe("Más: desfijar", () => {
  const props = {
    items: [a, b],
    onNavegar: () => undefined,
    fijados: new Set(["/a"]),
    onDesfijar: () => undefined,
  };
  it("con fijados ofrece «Editar»; los desfijar solo aparecen al editar (render inicial: ninguno)", () => {
    const html = renderToStaticMarkup(createElement(RecientesMas, props));
    expect(html).toContain("Editar");
    expect(html).not.toContain("Desfijar");
  });
  it("sin fijados o sin acción no hay «Editar»", () => {
    expect(
      renderToStaticMarkup(createElement(RecientesMas, { ...props, fijados: new Set<string>() })),
    ).not.toContain("Editar");
    const { onDesfijar: _quitar, ...sinAccion } = props;
    expect(renderToStaticMarkup(createElement(RecientesMas, sinAccion))).not.toContain("Editar");
  });
});
