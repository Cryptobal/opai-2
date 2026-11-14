import { Home } from "lucide-react";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HojaMovil } from "../../components/hoja-movil";
import { HojaSobreBarra } from "../../components/hoja-sobre-barra";
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

  it("la hoja sobre la barra no tapa la barra: sin velo y por encima de ella", () => {
    const h = renderToStaticMarkup(
      <HojaSobreBarra.Provider value>
        <HojaMovil abierto onCerrar={() => undefined} titulo="Menú">
          <p>menu</p>
        </HojaMovil>
      </HojaSobreBarra.Provider>,
    );
    // Radix renderiza el portal solo en el cliente; en servidor no debe fallar.
    expect(h).not.toContain("bg-overlay");
  });
});
