import { Users } from "lucide-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { baldosasDeAcceso, BuscadorMas, RecientesMas } from "./mas-acceso";

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

describe("Más: buscador y recientes", () => {
  it("el buscador es un botón con el texto del diseño", () => {
    const html = renderToStaticMarkup(createElement(BuscadorMas, { onBuscar: () => undefined }));
    expect(html).toContain("<button");
    expect(html).toContain("Buscar módulos, personas, documentos…");
  });
  it("la fila trae su título y una baldosa por entrada", () => {
    const html = renderToStaticMarkup(
      createElement(RecientesMas, { items: [a, b], onNavegar: () => undefined }),
    );
    expect(html).toContain("Recientes y fijados");
    expect(html).toContain("Alfa");
    expect(html).toContain("Beta");
    expect(html).toContain("grid-cols-4");
  });
  it("sin entradas muestra la ayuda y ninguna cuadrícula", () => {
    const html = renderToStaticMarkup(
      createElement(RecientesMas, { items: [], onNavegar: () => undefined }),
    );
    expect(html).toContain("Aquí aparecen las páginas que visitas y las que fijas.");
    expect(html).not.toContain("grid-cols-4");
  });
  it("con error ofrece reintentar", () => {
    const html = renderToStaticMarkup(
      createElement(RecientesMas, { items: [], onNavegar: () => undefined, error: true }),
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("Reintentar");
  });
});
