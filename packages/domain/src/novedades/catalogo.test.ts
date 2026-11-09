import { describe, expect, it } from "vitest";

import {
  catalogoNovedades,
  novedadesVisibles,
  parsearNovedadMarkdown,
} from "./catalogo";

describe("novedades", () => {
  it("parsea frontmatter y cuerpo", () => {
    const e = parsearNovedadMarkdown(`---
id: prueba
fecha: 2026-11-09
modulo: core
titulo: Título
destacada: true
ruta: /foo
---
Descripción para el usuario.
`);
    expect(e).toMatchObject({
      id: "prueba",
      modulo: "core",
      destacada: true,
      ruta: "/foo",
      descripcion: "Descripción para el usuario.",
    });
  });

  it("el catálogo del repositorio tiene entradas con id único", () => {
    const items = catalogoNovedades();
    expect(items.length).toBeGreaterThanOrEqual(5);
    expect(items.some((i) => i.id === "novedades-seccion")).toBe(true);
  });

  it("filtra por módulo activo", () => {
    const e = catalogoNovedades().find((i) => i.modulo === "finanzas");
    expect(e).toBeTruthy();
    const sinFinanzas = novedadesVisibles(catalogoNovedades(), ["comercial"], () => true, false);
    expect(sinFinanzas.some((i) => i.modulo === "finanzas")).toBe(false);
    const conFinanzas = novedadesVisibles(catalogoNovedades(), ["finanzas"], () => true, false);
    expect(conFinanzas.some((i) => i.modulo === "finanzas")).toBe(true);
  });
});
