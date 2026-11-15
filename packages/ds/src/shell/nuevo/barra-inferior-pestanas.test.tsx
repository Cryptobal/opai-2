import { Home } from "lucide-react";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ShellNuevo, type ShellNuevoProps } from "./shell-nuevo";

// CAR-416: en el teléfono Agente y Menú son pestañas de la barra inferior
// (export-diseno-nuevo/Telefono): la barra queda siempre a la vista.
const BASE: ShellNuevoProps = {
  titulo: "Inicio",
  nav: [{ href: "/", etiqueta: "Inicio", icono: Home }],
  rutaActual: "/",
  portales: [{ id: "erp", etiqueta: "ERP", href: "/" }],
  portalActual: "erp",
  onBuscar: () => undefined,
  usuario: { nombre: "QA E2E" },
  menuUsuario: [{ id: "salir", etiqueta: "Cerrar sesión", onSelect: () => undefined }],
  onAgente: () => undefined,
  children: <p>contenido</p>,
};

describe("pestañas de la barra inferior (CAR-416)", () => {
  it("Agente y Menú llevan su marca de pestaña", () => {
    const h = renderToStaticMarkup(<ShellNuevo {...BASE} />);
    expect(h).toContain("data-pestana-agente");
    expect(h).toContain("data-pestana-menu");
  });

  it("el botón del agente de la barra superior lleva su marca para ocultarlo en el teléfono", () => {
    const h = renderToStaticMarkup(<ShellNuevo {...BASE} agente={<span>agente-arriba</span>} />);
    expect(h).toMatch(/data-agente-telefono="[^"]*"[^>]*><span>agente-arriba<\/span>/);
  });
});
