import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Users } from "lucide-react";
import { expect, it } from "vitest";

import { Sidebar } from "../../../packages/ds/src/shell/sidebar";

it("muestra todas las entradas sin acordeones desde el primer render", () => {
  const html = renderToStaticMarkup(
    createElement(Sidebar, {
      items: [
        {
          href: "/cuentas",
          etiqueta: "Cuentas",
          grupo: "Clientes",
          area: "clientes",
          icono: Users,
        },
        {
          href: "/instalaciones",
          etiqueta: "Instalaciones",
          grupo: "Clientes",
          area: "clientes",
          icono: Users,
        },
      ],
      rutaActual: "/cuentas",
      portales: [],
      portalActual: "erp",
    }),
  );
  expect(html).toContain("Clientes</h2>");
  expect(html).toContain("/cuentas");
  expect(html).toContain("/instalaciones");
  expect(html).not.toContain("aria-controls");
});
