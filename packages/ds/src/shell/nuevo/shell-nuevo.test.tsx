import { Home } from "lucide-react";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AreaGrupo } from "../area-grupo";
import { ShellNuevo, type ShellNuevoProps } from "./shell-nuevo";

const BASE: ShellNuevoProps = {
  titulo: "Inicio",
  nav: [{ href: "/", etiqueta: "Inicio", icono: Home }],
  rutaActual: "/",
  portales: [{ id: "erp", etiqueta: "ERP", href: "/" }],
  portalActual: "erp",
  onBuscar: () => undefined,
  children: <p>contenido</p>,
};
const html = (p: Partial<ShellNuevoProps> = {}) =>
  renderToStaticMarkup(<ShellNuevo {...BASE} {...p} />);

describe("shell del diseño nuevo (CAR-335 D2b)", () => {
  it("pinta el menú plegado desde el primer render cuando el servidor lo indica", () => {
    expect(html({ plegadoInicial: true })).toContain('data-menu="plegado"');
    expect(html()).toContain('data-menu="fijo"');
  });

  it("la barra trae el buscador único y, con onTema, el botón de tema", () => {
    const conTema = html({ onTema: () => undefined });
    expect(conTema).toContain("Busca o pídele algo a OPAI");
    expect(conTema).toContain('aria-label="Cambiar entre día y noche"');
    expect(html()).not.toContain("Cambiar entre día y noche");
  });

  it("buscador, título, acciones y grupo llevan su marca para ordenarlos con CSS", () => {
    const h = html({ acciones: <span>accion</span> });
    for (const marca of ["barra", "titulo", "buscar", "acciones", "grupo"])
      expect(h).toContain(`data-shell="${marca}"`);
  });
});

describe("área plegada del menú", () => {
  it("sin relleno: nada del contenido asoma bajo el encabezado", () => {
    const plegada = renderToStaticMarkup(
      <AreaGrupo
        etiqueta="Comercial"
        icono={Home}
        abierto={false}
        activa={false}
        onAlternar={() => undefined}
      >
        <a href="/cuentas">Cuentas</a>
      </AreaGrupo>,
    );
    // La caja que mide la fila no tiene relleno; el relleno vive en su hijo.
    expect(plegada).toContain(
      '<div class="min-h-0 overflow-hidden"><div class="flex flex-col gap-0.5 pt-0.5 pb-1.5">',
    );
  });
});
