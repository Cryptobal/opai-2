import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HiloShell } from "./hilo-shell";
import type { HiloShellProps } from "./props";
import { clasesVista, pendienteAbierto, vistaHilo } from "./vista";

const BASE: HiloShellProps = {
  monograma: "G",
  sujeto: "Gard Security",
  sujetoSub: "ERP · Camilo Ibarra",
  saludo: "Buen día, Camilo.",
  resumen: "2 decisiones te esperan.",
  rutaActual: "/",
  inicioHref: "/",
  ancha: false,
  titulo: "Inicio",
  pendientes: {
    estado: "listo",
    items: [
      { id: "a", origen: "Agentes", agente: true, titulo: "3 aprobaciones de agentes", contexto: "1 de riesgo alto", href: "/configuracion/aprobaciones", accion: "Revisar" },
      { id: "b", origen: "Personas", titulo: "2 documentos vencidos", href: "/personas/vencimientos", accion: "Pedir renovación" },
    ],
  },
  actividad: { estado: "listo", items: [] },
  agenda: { estado: "listo", items: [] },
  indice: [{ id: "clientes", nombre: "Clientes", entradas: [{ href: "/cuentas", etiqueta: "Cuentas" }] }],
  portales: [
    { id: "erp", etiqueta: "ERP", href: "/" },
    { id: "supervisor", etiqueta: "Supervisor", href: "/supervisor" },
  ],
  portalActual: "erp",
  empresas: [],
  cuenta: [{ id: "salir", etiqueta: "Cerrar sesión", onSelect: () => undefined }],
  barra: { agente: false, texto: "Busca una pantalla o un registro" },
  onBuscar: () => undefined,
  onTema: () => undefined,
  children: <p>contenido de la página</p>,
};
const html = (p: Partial<HiloShellProps> = {}) => renderToStaticMarkup(<HiloShell {...BASE} {...p} />);

describe("vista del marco Hilo", () => {
  it("el contenido desplazable del lienzo se marca para subirlo tras el esqueleto (CAR-317)", () => {
    expect(html()).toMatch(/<main data-lienzo[^>]*overflow-y-auto/);
  });

  it("Inicio abre el hilo, una pantalla lo deja al lado o plegado y una planilla lo pliega", () => {
    expect(vistaHilo("/", "/", false)).toBe("inicio");
    expect(vistaHilo("/cuentas/1", "/", false)).toBe("pantalla");
    expect(vistaHilo("/pauta", "/", true)).toBe("ancha");
  });

  it("en teléfono Inicio muestra el hilo hasta que se abre el lienzo", () => {
    expect(clasesVista("inicio", false)).toEqual({ hilo: "flex", riel: "hidden", lienzo: "hidden lg:flex" });
    expect(clasesVista("inicio", true)).toEqual({ hilo: "hidden lg:flex", riel: "hidden", lienzo: "flex" });
  });

  it("una pantalla pliega el hilo en el riel bajo 1400 px y una planilla siempre", () => {
    expect(clasesVista("pantalla", false)).toEqual({
      hilo: "hidden hilo:flex",
      riel: "hidden lg:flex hilo:hidden",
      lienzo: "flex",
    });
    expect(clasesVista("ancha", false)).toEqual({ hilo: "hidden", riel: "hidden lg:flex", lienzo: "flex" });
  });
});

describe("pendiente abierto en el lienzo", () => {
  it("se resalta el pendiente cuya pantalla está abierta, sin contar su búsqueda ni el inicio", () => {
    expect(pendienteAbierto("/personas/vencimientos", "/personas/vencimientos?origen=inicio", "/")).toBe(true);
    expect(pendienteAbierto("/configuracion/aprobaciones/7", "/configuracion/aprobaciones", "/")).toBe(true);
    expect(pendienteAbierto("/cuentas", "/personas/vencimientos", "/")).toBe(false);
    expect(pendienteAbierto("/", "/", "/")).toBe(false);
    expect(pendienteAbierto("/ds/hilo", "/ds/hilo?de=pendiente", "/ds/hilo")).toBe(false);
  });
});

describe("marco Hilo", () => {
  it("marca la piel y nombra sus tres piezas", () => {
    const h = html();
    expect(h).toContain('data-marco="hilo"');
    expect(h).toContain('data-vista="inicio"');
    expect(h).toContain('aria-label="Hilo"');
    expect(h).toContain("<main");
    expect(h).toContain("Busca una pantalla o un registro");
    expect(h).toContain("Buen día, Camilo.");
  });

  it("Pendientes lleva la cuenta y cada pendiente con su acción y su destino", () => {
    const h = html();
    expect(h).toMatch(/Pendientes<\/span><span[^>]*>2</);
    expect(h).toContain("3 aprobaciones de agentes");
    expect(h).toContain('href="/personas/vencimientos"');
    expect(h).toContain("Pedir renovación");
  });

  it("solo lo que viene de un agente se marca como tal", () => {
    expect(html().match(/data-agente="true"/g)).toHaveLength(1);
  });

  it("sin pendientes lo dice; cargando y con error no afirman que no hay nada", () => {
    expect(html({ pendientes: { estado: "listo", items: [] } })).toContain("Nada espera tu decisión.");
    const cargando = html({ pendientes: { estado: "cargando", items: [] } });
    expect(cargando).toContain('aria-busy="true"');
    expect(cargando).not.toContain("Nada espera tu decisión.");
    const error = html({ pendientes: { estado: "error", items: [] }, onReintentar: () => undefined });
    expect(error).toContain("Reintentar");
    expect(error).not.toContain("Nada espera tu decisión.");
  });

  it("la barra va en índigo solo donde hay agente; sin agente, busca en tinta", () => {
    const sin = html();
    expect(sin).toContain('data-barra="busqueda"');
    expect(sin).not.toContain("bg-accent text-accent-fg");
    const con = html({ barra: { agente: true, texto: "Pide, pregunta o busca una pantalla" } });
    expect(con).toContain('data-barra="agente"');
    expect(con).toContain("Pide, pregunta o busca una pantalla");
  });

  it("Portales describe cada portal y deja el tema a mano", () => {
    const h = html({
      panelInicial: "portales",
      portales: [{ id: "erp", etiqueta: "ERP", href: "/", descripcion: "Dueños, gerencia y administración" }],
    });
    expect(h).toContain("Dueños, gerencia y administración");
    expect(h).toContain("Cambiar entre tema claro y oscuro");
  });

  it("Actividad distingue vacío de sin permiso", () => {
    expect(html({ segmentoInicial: "actividad" })).toContain("Todavía no hay actividad.");
    expect(
      html({ segmentoInicial: "actividad", actividad: { estado: "sin-permiso", items: [] } }),
    ).toContain("No tienes permiso para ver la actividad.");
  });

  it("el Índice agrupa las entradas por área y conserva la página montada", () => {
    const h = html({ panelInicial: "indice" });
    expect(h).toContain("Clientes");
    expect(h).toContain('href="/cuentas"');
    expect(h).toMatch(/hidden=""[^>]*>\s*<p>contenido de la página/);
  });

  it("Portales marca dónde estás y ofrece entrar a los demás y la cuenta", () => {
    const h = html({
      panelInicial: "portales",
      empresas: [{ id: "t-2", etiqueta: "Otra Empresa SpA", onSelect: () => undefined }],
    });
    expect(h).toContain("Aquí estás");
    expect(h).toContain('href="/supervisor"');
    expect(h).toContain("Otra Empresa SpA");
    expect(h).toContain("Cerrar sesión");
  });

  it("una pantalla vuelve a su padre o al hilo, y una planilla pliega el hilo", () => {
    const ficha = html({ rutaActual: "/cuentas/1", titulo: "Logística", volver: { href: "/cuentas", etiqueta: "Cuentas" } });
    expect(ficha).toContain('data-vista="pantalla"');
    expect(ficha).toMatch(/href="\/cuentas"[^>]*aria-label="Volver a Cuentas"/);
    const lista = html({ rutaActual: "/cuentas", titulo: "Cuentas" });
    expect(lista).toMatch(/href="\/"[^>]*aria-label="Volver al hilo"/);
    expect(html({ rutaActual: "/pauta", ancha: true, titulo: "Pauta" })).toContain('data-vista="ancha"');
  });
});
