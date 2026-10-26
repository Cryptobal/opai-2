import { Home, MapPin, Users } from "lucide-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BottomNav } from "./nav";
import { TopBarTelefono } from "./top-bar";
import type { NavItem } from "./types";

// Teléfono (ShellPhone, ADR-050): «Buscar» va en la barra superior y no en la inferior.
const items: NavItem[] = [
  { href: "/", etiqueta: "Inicio", icono: Home },
  { href: "/personas", etiqueta: "Personas", icono: Users },
  { href: "/instalaciones", etiqueta: "Instalaciones", icono: MapPin, fueraInferior: true },
];
const portales = [{ id: "erp", etiqueta: "ERP", href: "/" }];

describe("shell del teléfono", () => {
  it("la barra superior trae Buscar antes de la campana y el avatar", () => {
    const html = renderToStaticMarkup(
      createElement(TopBarTelefono, {
        portales,
        portalActual: "erp",
        usuario: { nombre: "Carlos Irigoyen" },
        campana: createElement("span", { "data-campana": "" }),
        onBuscar: () => undefined,
      }),
    );
    const buscar = html.indexOf('aria-label="Buscar"');
    expect(buscar).toBeGreaterThan(-1);
    expect(buscar).toBeLessThan(html.indexOf("data-campana"));
    expect(html.indexOf("data-campana")).toBeLessThan(html.indexOf('title="Carlos Irigoyen"'));
  });

  it("sin búsqueda, la barra superior no trae Buscar", () => {
    const html = renderToStaticMarkup(
      createElement(TopBarTelefono, { portales, portalActual: "erp" }),
    );
    expect(html).not.toContain('aria-label="Buscar"');
  });

  it("la barra inferior no trae Buscar; el activo lleva el ícono en acento y la etiqueta en fg", () => {
    const html = renderToStaticMarkup(createElement(BottomNav, { items, rutaActual: "/" }));
    expect(html).not.toContain("Buscar");
    const activo = /<a([^>]*aria-current="page"[^>]*)>(.*?)<\/a>/.exec(html);
    expect(activo?.[1]).toMatch(/class="[^"]*\btext-fg\b/);
    expect(activo?.[2]).toContain("text-accent");
  });
});
