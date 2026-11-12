import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TarjetaNovedad, type ItemNovedad } from "@/app/_components/novedades/tarjeta-novedad";
import { LineaNovedad, TextoNovedad } from "@/app/_components/novedades/texto-novedad";

const item = (leida: boolean): ItemNovedad => ({
  id: "n1",
  fecha: "2026-11-11",
  moduloEtiqueta: "Núcleo",
  titulo: "Algo nuevo",
  descripcion: "Ahora ves **Novedades** con *formato*.\n\n- uno\n- **dos**",
  ruta: "/novedades",
  imagen: null,
  destacada: false,
  car: "CAR-316",
  leida,
});

describe("texto de las novedades (CAR-316)", () => {
  it("dibuja negrita, cursiva y listas sin asteriscos", () => {
    const html = renderToStaticMarkup(createElement(TextoNovedad, { texto: item(false).descripcion }));
    expect(html).toContain("<strong");
    expect(html).toContain("<em>formato</em>");
    expect(html).toMatch(/<ul[^>]*><li>uno<\/li><li><strong[^>]*>dos<\/strong><\/li><\/ul>/);
    expect(html).not.toContain("*");
  });

  it("no inyecta HTML: las etiquetas del texto llegan escapadas", () => {
    const html = renderToStaticMarkup(
      createElement(TextoNovedad, { texto: '<script>alert(1)</script> [x](javascript:alert)' }),
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("javascript:");
  });

  it("el aviso destacado muestra solo el primer párrafo con formato", () => {
    const html = renderToStaticMarkup(createElement(LineaNovedad, { texto: "Hola **tú**\nsigue.\n\nOtro" }));
    expect(html).toBe("Hola <strong class=\"font-semibold\">tú</strong> sigue.");
  });
});

describe("tarjeta de novedad (CAR-316)", () => {
  it("la no leída lleva «Nueva» y el botón «Marcar como leída»", () => {
    const html = renderToStaticMarkup(createElement(TarjetaNovedad, { item: item(false), onMarcar: () => {} }));
    expect(html).toContain("Nueva");
    expect(html).toContain("Marcar como leída");
    expect(html).not.toContain("Nueva ·");
  });

  it("la leída no muestra la etiqueta ni el botón", () => {
    const html = renderToStaticMarkup(createElement(TarjetaNovedad, { item: item(true), onMarcar: () => {} }));
    expect(html).not.toContain("Nueva");
    expect(html).not.toContain("Marcar como leída");
  });
});
