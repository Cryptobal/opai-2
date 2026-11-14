import { Briefcase, Home } from "lucide-react";
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

describe("barra inferior del teléfono (CAR-335 D2c)", () => {
  const conUsuario = {
    usuario: { nombre: "QA E2E" },
    menuUsuario: [{ id: "salir", etiqueta: "Cerrar sesión", onSelect: () => undefined }],
  };
  it("trae Inicio, Menú y Yo, y se distingue de la barra clásica", () => {
    const h = html(conUsuario);
    for (const texto of [">Inicio<", ">Menú<", ">Yo<"]) expect(h).toContain(texto);
    expect(h).toContain('data-shell="inferior-nuevo"');
  });

  it("la pestaña Agente aparece solo si hay agente", () => {
    expect(html({ ...conUsuario, onAgente: () => undefined })).toContain(">Agente<");
    expect(html(conUsuario)).not.toContain(">Agente<");
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

describe("riel del menú plegado (CAR-377)", () => {
  it("muestra el primer nivel y un ícono por área, no cada submódulo", () => {
    const h = html({
      nav: [
        { href: "/", etiqueta: "Inicio", icono: Home },
        {
          href: "/negocios",
          etiqueta: "Negocios",
          icono: Briefcase,
          grupo: "Comercial",
          area: "comercial",
        },
        {
          href: "/cuentas",
          etiqueta: "Cuentas",
          icono: Briefcase,
          grupo: "Comercial",
          area: "comercial",
        },
      ],
    });
    const riel = h.slice(
      h.indexOf('data-shell="riel"'),
      h.indexOf("</nav>", h.indexOf('data-shell="riel"')),
    );
    expect(riel).toContain(">Inicio<");
    expect(riel).toContain(">Comercial<");
    expect(riel).not.toContain(">Negocios<");
    expect(riel).not.toContain(">Cuentas<");
  });
  it("el área marca la página actual y suma los avisos de sus submódulos", () => {
    const h = html({
      rutaActual: "/solicitudes",
      nav: [
        { href: "/", etiqueta: "Inicio", icono: Home },
        {
          href: "/negocios",
          etiqueta: "Negocios",
          icono: Briefcase,
          grupo: "Comercial",
          area: "comercial",
        },
        {
          href: "/solicitudes",
          etiqueta: "Solicitudes",
          icono: Briefcase,
          grupo: "Comercial",
          area: "comercial",
          alerta: true,
          contador: 3,
        },
        { href: "/configuracion", etiqueta: "Configuración", icono: Home, pie: true },
      ],
    });
    const inicio = h.indexOf('data-shell="riel"');
    const riel = h.slice(inicio, h.indexOf("</nav>", inicio));
    expect(riel).toContain('aria-current="true"');
    expect(riel).toContain(">3<");
    expect(riel).not.toContain("aria-haspopup");
    expect(riel.indexOf(">Configuración<")).toBeGreaterThan(riel.indexOf(">Comercial<"));
  });

  it("los portales de terreno conservan sus pestañas en el teléfono (CAR-335 D6e)", () => {
    const terreno = html({ pestanasDelPortal: true });
    expect(terreno).toContain('data-pestanas="portal"');
    expect(terreno).not.toContain('data-shell="inferior-nuevo"');
    expect(html()).toContain('data-shell="inferior-nuevo"');
    expect(html()).not.toContain("data-pestanas");
  });
});
