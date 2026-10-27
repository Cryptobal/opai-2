import { Home, Settings2 } from "lucide-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Sidebar } from "./sidebar";
import type { NavItem } from "./types";

// Marcado del servidor de la barra lateral de escritorio (ShellDesktop, ADR-050): marca, selector de
// portal en tarjeta, ítems, Configuración y el usuario al pie.
const items: NavItem[] = [
  { href: "/", etiqueta: "Inicio", icono: Home },
  { href: "/configuracion", etiqueta: "Configuración", icono: Settings2, pie: true },
];
const base = {
  items,
  rutaActual: "/",
  portales: [
    { id: "erp", etiqueta: "ERP", href: "/" },
    { id: "trabajador", etiqueta: "Trabajador", href: "/trabajador" },
  ],
  portalActual: "erp",
  tenant: { nombre: "Atlas Seguridad SpA" },
};
const usuario = { nombre: "Carlos Irigoyen", rol: "Administrador" };

describe("Sidebar", () => {
  it("lleva la marca y el selector de portal en tarjeta con el portal y la empresa", () => {
    const html = renderToStaticMarkup(createElement(Sidebar, base));
    expect(html).toContain(">OPAI</span>");
    expect(html).toMatch(
      /aria-label="Atlas Seguridad SpA · portal ERP\. Cambiar de portal o empresa"/,
    );
    expect(html).toMatch(/<span class="t-label-sm[^"]*">ERP<\/span>/);
    expect(html).toContain("Atlas Seguridad SpA</span>");
    expect(html).toContain("lucide-chevrons-up-down");
  });

  it("pone al usuario al pie, después de Configuración", () => {
    const html = renderToStaticMarkup(createElement(Sidebar, { ...base, usuario }));
    expect(html.indexOf("Configuración")).toBeLessThan(html.indexOf("Carlos Irigoyen"));
    expect(html).toContain("Administrador");
  });

  it("con menú, el pie es el disparador del menú de usuario", () => {
    const menuUsuario = [{ id: "salir", etiqueta: "Cerrar sesión", onSelect: () => undefined }];
    const html = renderToStaticMarkup(createElement(Sidebar, { ...base, usuario, menuUsuario }));
    expect(html).toContain('aria-label="Menú de usuario"');
  });
});
