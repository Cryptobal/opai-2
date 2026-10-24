import { Home, Settings2, Users } from "lucide-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Rail } from "./rail";
import type { NavItem, Portal } from "./types";

// Marcado del servidor del riel de iPad con el selector de portal y empresa. El menú abierto, el
// teclado y el cambio real de portal y de empresa se prueban en Playwright (proyecto `ipad`,
// apps/web/e2e/selector-riel.spec.ts).
const nav: NavItem[] = [
  { href: "/", etiqueta: "Inicio", icono: Home },
  { href: "/personas", etiqueta: "Personas", icono: Users },
  { href: "/configuracion", etiqueta: "Configuración", icono: Settings2, pie: true },
];
const portales: Portal[] = [
  { id: "erp", etiqueta: "ERP", href: "/" },
  { id: "platform", etiqueta: "Plataforma", href: "/platform" },
];
const empresas = [
  { id: "t-1", etiqueta: "Atlas Seguridad SpA", marcado: true, onSelect: () => undefined },
  { id: "t-2", etiqueta: "Gard Security", onSelect: () => undefined },
];
const base = { items: nav, rutaActual: "/personas" };

function selector(html: string) {
  return /<button[^>]*aria-haspopup="menu"[^>]*>/.exec(html)?.[0];
}

describe("Rail con selector de portal y empresa", () => {
  it("muestra el selector bajo la marca, con nombre accesible y objetivo táctil de 64 px", () => {
    const html = renderToStaticMarkup(
      createElement(Rail, {
        ...base,
        portales,
        portalActual: "erp",
        tenant: { nombre: "Atlas Seguridad SpA" },
        empresas,
      }),
    );
    const boton = selector(html);
    expect(boton).toBeTruthy();
    expect(boton).toContain(
      'aria-label="Atlas Seguridad SpA · portal ERP. Cambiar de portal o empresa"',
    );
    // h-16 w-16 = 64 px: sobre el mínimo de 44 px táctil.
    expect(boton).toMatch(/\bh-16\b/);
    expect(boton).toMatch(/\bw-16\b/);
    expect(html).toContain(">AS<");
    expect(html).toContain(">ERP<");
    expect(html.indexOf("OPAI")).toBeLessThan(html.indexOf("aria-haspopup"));
    expect(html.indexOf("aria-haspopup")).toBeLessThan(html.indexOf('href="/"'));
  });

  it("sigue siendo el riel de iPad: oculto en teléfono y en desktop", () => {
    const html = renderToStaticMarkup(
      createElement(Rail, { ...base, portales, portalActual: "erp" }),
    );
    expect(html).toMatch(/<nav[^>]*class="[^"]*\bhidden\b[^"]*\bmd:flex\b[^"]*\bxl:hidden\b/);
  });

  it("sin empresa activa el selector nombra a OPAI", () => {
    const html = renderToStaticMarkup(
      createElement(Rail, { ...base, portales, portalActual: "platform" }),
    );
    expect(selector(html)).toContain(
      'aria-label="OPAI · portal Plataforma. Cambiar de portal o empresa"',
    );
  });

  it("con un solo portal y una sola empresa no ofrece un menú vacío", () => {
    const html = renderToStaticMarkup(
      createElement(Rail, {
        ...base,
        portales: [{ id: "erp", etiqueta: "ERP", href: "/" }],
        portalActual: "erp",
        tenant: { nombre: "Gard Security" },
      }),
    );
    expect(selector(html)).toBeUndefined();
    expect(html).toContain(">GS<");
    expect(html).not.toContain("lucide-chevron-down");
    // Mismo apilado vertical de 64 × 64 que el botón con menú: monograma sobre el portal.
    const clase = /<span class="([^"]*)" title="Gard Security"/.exec(html)?.[1] ?? "";
    for (const c of ["flex-col", "h-16", "w-16"]) expect(clase.split(" ")).toContain(c);
  });

  it("con varios portales muestra la flecha y la etiqueta sin recortarla por la flecha", () => {
    const html = renderToStaticMarkup(
      createElement(Rail, { ...base, portales, portalActual: "erp", tenant: { nombre: "Gard" } }),
    );
    expect(html).toContain("lucide-chevron-down");
    expect(html).toMatch(
      /<svg[^>]*absolute[^>]*lucide-chevron-down|lucide-chevron-down[^>]*absolute/,
    );
  });

  it("conserva los ítems y la marca del portal", () => {
    const html = renderToStaticMarkup(
      createElement(Rail, {
        ...base,
        subtitulo: "Plataforma",
        portales,
        portalActual: "platform",
      }),
    );
    expect(html).toContain('t-caption">Plataforma');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("Configuración");
  });
});
