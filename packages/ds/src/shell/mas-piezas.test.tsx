import { Building2, Ticket } from "lucide-react";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BusquedaHoja } from "../components/busqueda-hoja";
import { AccesoRapido } from "./acceso-rapido";
import { EncabezadoAreaMas } from "./encabezado-area-mas";
import { EntradaMas } from "./entrada-mas";
import { ListaAreasMas } from "./lista-areas-mas";
import { estructuraMas } from "./mas-areas";
import type { NavItem } from "./types";

const nada = () => undefined;
const nav: NavItem[] = [
  { href: "/negocios", etiqueta: "Negocios", icono: Building2, grupo: "Comercial", area: "comercial" },
  { href: "/cuentas", etiqueta: "Cuentas", icono: Building2, grupo: "Comercial", area: "comercial" },
  { href: "/tickets", etiqueta: "Tickets", icono: Ticket, grupo: "Operaciones", area: "operaciones" },
  { href: "/instalaciones", etiqueta: "Instalaciones", icono: Ticket, grupo: "Operaciones", area: "operaciones" },
  { href: "/remuneraciones", etiqueta: "Remuneraciones", icono: Ticket, grupo: "Personas", area: "personas" },
];

describe("EntradaMas", () => {
  it("fila de 48 px con el nombre completo (dos líneas, sin cortar) y marca de la activa", () => {
    const html = renderToStaticMarkup(
      <EntradaMas item={nav[0]!} activo onNavegar={nada} />,
    );
    expect(html).toContain("min-h-12");
    expect(html).toContain("line-clamp-2");
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("before:bg-accent");
    expect(html).not.toContain("truncate");
  });
  it("sin activa no lleva aria-current; fijada lleva pin", () => {
    const html = renderToStaticMarkup(<EntradaMas item={nav[0]!} fijada onNavegar={nada} />);
    expect(html).not.toContain("aria-current");
    expect(html).toContain('aria-label="Fijado"');
  });
});

describe("EncabezadoAreaMas", () => {
  const base = { nombre: "Comercial", icono: Building2, cantidad: 2, controla: "l1", onAlternar: nada };
  it("expone aria-expanded y el conteo", () => {
    const abierto = renderToStaticMarkup(<EncabezadoAreaMas {...base} abierta />);
    expect(abierto).toContain('aria-expanded="true"');
    expect(abierto).toContain("2 entradas");
    expect(abierto).toContain("<h2");
    expect(renderToStaticMarkup(<EncabezadoAreaMas {...base} abierta={false} cantidad={1} />)).toContain("1 entrada<");
  });
  it("plegada con la página actual dentro lo avisa", () => {
    expect(
      renderToStaticMarkup(<EncabezadoAreaMas {...base} abierta={false} contienePaginaActual />),
    ).toContain("Contiene la página actual");
  });
});

describe("AccesoRapido", () => {
  const item = { href: "/a", etiqueta: "Cotizaciones de la semana", icono: Building2 };
  it("etiqueta en una línea con título completo; fijado con pin; activo con aria-current", () => {
    const html = renderToStaticMarkup(<AccesoRapido item={item} fijado activo onNavegar={nada} />);
    expect(html).toContain('title="Cotizaciones de la semana"');
    expect(html).toContain("truncate");
    expect(html).toContain('aria-label="Fijado"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("min-h-11");
  });
  it("en edición trae el botón de 44 px para desfijar o fijar", () => {
    const d = renderToStaticMarkup(
      <AccesoRapido item={item} onNavegar={nada} edicion={{ accion: "desfijar", onAccion: nada }} />,
    );
    expect(d).toContain('aria-label="Desfijar Cotizaciones de la semana"');
    expect(d).toContain("size-11");
    const f = renderToStaticMarkup(
      <AccesoRapido item={item} onNavegar={nada} edicion={{ accion: "fijar", onAccion: nada }} />,
    );
    expect(f).toContain('aria-label="Fijar Cotizaciones de la semana"');
  });
});

describe("ListaAreasMas (variante A)", () => {
  const { areas } = estructuraMas(nav, "/tickets");
  const props = { areas, rutaActual: "/tickets", fijadas: new Set(["/cuentas"]), onNavegar: nada, onAlternar: nada };
  it("solo el área activa viene abierta; las demás, plegadas e inertes", () => {
    const html = renderToStaticMarkup(<ListaAreasMas {...props} abiertas={new Set(["operaciones"])} />);
    expect(html.match(/aria-expanded="true"/g)).toHaveLength(1);
    expect(html.match(/aria-expanded="false"/g)).toHaveLength(1);
    expect(html.match(/inert=""/g)).toHaveLength(1);
  });
  it("marca la entrada activa y el fijado con pin, sin repetir entradas", () => {
    const html = renderToStaticMarkup(<ListaAreasMas {...props} abiertas={new Set(["comercial", "operaciones"])} />);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html.match(/aria-label="Fijado"/g)).toHaveLength(1);
    for (const e of nav) expect(html.split(`href="${e.href}"`).length - 1, e.href).toBe(1);
  });
  it("un área de una entrada va en una sola fila, sin botón de plegar", () => {
    const html = renderToStaticMarkup(<ListaAreasMas {...props} abiertas={new Set()} />);
    expect(html).toContain("Personas");
    expect(html).toContain('href="/remuneraciones"');
    expect(html.match(/<button/g)).toHaveLength(2);
  });
});

describe("búsqueda unificada (BusquedaHoja)", () => {
  const iniciales = [
    { titulo: "Agente", items: [{ id: "agente:", etiqueta: "Preguntar a OPAI", href: "#" }] },
    { titulo: "Recientes", items: [{ id: "/a", etiqueta: "Cuentas", href: "/cuentas" }] },
    { titulo: "Acciones", items: [{ id: "n", etiqueta: "Nueva cuenta", href: "/cuentas?nueva=1" }] },
  ];
  const buscar = () => Promise.resolve([]);
  it("campo vacío: Agente, Recientes y Acciones, en ese orden", () => {
    const html = renderToStaticMarkup(
      <BusquedaHoja q="" buscar={buscar} iniciales={iniciales} onElegir={nada} />,
    );
    const orden = ["Agente", "Recientes", "Acciones"].map((t) => html.indexOf(`>${t}<`));
    expect(orden.every((n) => n > -1)).toBe(true);
    expect([...orden].sort((x, y) => x - y)).toEqual(orden);
  });
  it("con texto y sin respuesta aún: esqueleto cargando, sin los grupos iniciales", () => {
    const html = renderToStaticMarkup(
      <BusquedaHoja q="cob" buscar={buscar} iniciales={iniciales} onElegir={nada} />,
    );
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain("Preguntar a OPAI");
  });
});
