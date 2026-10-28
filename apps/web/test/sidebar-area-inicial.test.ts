import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Users } from "lucide-react";
import { expect, it } from "vitest";

import { Sidebar } from "../../../packages/ds/src/shell/sidebar";

it("abre el área de la ruta actual desde el primer render", () => {
  const html = renderToStaticMarkup(createElement(Sidebar, {
    items: [
      { href: "/cuentas", etiqueta: "Cuentas", grupo: "Clientes", area: "clientes", icono: Users },
      { href: "/instalaciones", etiqueta: "Instalaciones", grupo: "Clientes", area: "clientes", icono: Users },
    ],
    rutaActual: "/cuentas",
    portales: [],
    portalActual: "erp",
  }));
  expect(html).toMatch(/aria-expanded="true"[^>]*>.*Clientes/);
});
