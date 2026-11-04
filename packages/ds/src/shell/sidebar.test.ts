import { Home, PenLine, Settings2, Users } from "lucide-react";
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

  it("en el acordeón, un área con una sola entrada lleva su encabezado y no queda suelta", () => {
    const conAreas: NavItem[] = [
      ...items.slice(0, 1),
      { href: "/personas", etiqueta: "Personas", icono: Users, grupo: "Personas", area: "personas" },
      { href: "/firmas", etiqueta: "Firmas", icono: PenLine, grupo: "Documentos", area: "documentos" },
    ];
    const html = renderToStaticMarkup(
      createElement(Sidebar, {
        ...base,
        items: conAreas,
        rutaActual: "/firmas",
        areaAbierta: "documentos",
        onAreaAbierta: () => undefined,
      }),
    );
    // Encabezado del área con chevron y aria-expanded; Firmas dentro, con la barra de la activa.
    expect(html).toMatch(/<button[^>]*aria-expanded="true"[^>]*>.*?Documentos/s);
    expect(html).toMatch(/<button[^>]*aria-expanded="false"[^>]*>.*?Personas/s);
    expect(html).toContain('aria-current="page"');
    // El área activa se distingue del resto aunque esté plegada.
    expect(html).toContain("font-semibold");
  });

  it("plegada, el área de la página actual sigue marcada y su contenido queda inerte", () => {
    const conAreas: NavItem[] = [
      { href: "/personas", etiqueta: "Personas", icono: Users, grupo: "Personas", area: "personas" },
      { href: "/firmas", etiqueta: "Firmas", icono: PenLine, grupo: "Documentos", area: "documentos" },
    ];
    const html = renderToStaticMarkup(
      createElement(Sidebar, {
        ...base,
        items: conAreas,
        rutaActual: "/firmas",
        areaAbierta: "personas",
        onAreaAbierta: () => undefined,
      }),
    );
    const documentos = html.match(/<button[^>]*aria-expanded="false"[^>]*>(?:(?!<\/button>).)*Documentos/s);
    expect(documentos?.[0]).toContain("font-semibold");
    expect(html).toContain("inert");
  });

  it("sin acordeón, la entrada suelta no lleva botón y el grupo con varias entradas lleva título", () => {
    const planos: NavItem[] = [
      ...items.slice(0, 1),
      { href: "/a", etiqueta: "Alfa", icono: Users, grupo: "Grupo", area: "x" },
      { href: "/b", etiqueta: "Beta", icono: Users, grupo: "Grupo", area: "x" },
    ];
    const html = renderToStaticMarkup(createElement(Sidebar, { ...base, items: planos }));
    expect(html).not.toContain("aria-controls");
    expect(html).toMatch(/<h2[^>]*>Grupo<\/h2>/);
  });
});
