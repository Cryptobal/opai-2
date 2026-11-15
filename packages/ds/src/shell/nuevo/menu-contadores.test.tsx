import { Briefcase, Home } from "lucide-react";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GrupoNav } from "../sidebar-grupos";
import type { NavItem } from "../types";
import { ShellNuevo, type ShellNuevoProps } from "./shell-nuevo";

// CAR-386: el aviso que se ve en el ícono de un área del riel también se ve al desplegar el menú.
const COMERCIAL: NavItem[] = [
  { href: "/negocios", etiqueta: "Negocios", icono: Briefcase, grupo: "Comercial", area: "comercial" },
  {
    href: "/solicitudes",
    etiqueta: "Solicitudes",
    icono: Briefcase,
    grupo: "Comercial",
    area: "comercial",
    alerta: true,
    contador: 2,
  },
];
const Link = (p: React.ComponentProps<"a">) => <a {...p} />;
const grupo = (abierto: string | null) =>
  renderToStaticMarkup(
    <GrupoNav
      grupo="Comercial"
      lista={COMERCIAL}
      rutaActual="/"
      Link={Link}
      abierto={abierto}
      onAreaAbierta={() => undefined}
      pinDe={() => ({})}
    />,
  );

describe("contadores del menú plegado y desplegado (CAR-386)", () => {
  it("el área plegada muestra la suma de sus avisos en el encabezado", () => {
    const h = grupo(null);
    const encabezado = h.slice(0, h.indexOf("</button>"));
    expect(encabezado).toContain(">2<");
  });

  it("al abrir el área, el número pasa a la entrada que lo tiene (Solicitudes)", () => {
    const h = grupo("comercial");
    const encabezado = h.slice(0, h.indexOf("</button>"));
    expect(encabezado).not.toContain(">2<");
    expect(h.slice(h.indexOf(">Solicitudes<"))).toContain(">2<");
  });

  it("cada área del riel lleva su marca para abrirse al asomar el menú", () => {
    const props: ShellNuevoProps = {
      titulo: "Inicio",
      nav: [{ href: "/", etiqueta: "Inicio", icono: Home }, ...COMERCIAL],
      rutaActual: "/",
      portales: [{ id: "erp", etiqueta: "ERP", href: "/" }],
      portalActual: "erp",
      onBuscar: () => undefined,
      children: <p>contenido</p>,
    };
    expect(renderToStaticMarkup(<ShellNuevo {...props} />)).toContain('data-area="comercial"');
  });
});
