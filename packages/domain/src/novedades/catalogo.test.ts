import { readdirSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  catalogoNovedades,
  directorioEntradasNovedades,
  novedadesVisibles,
  compararNovedades,
  parsearNovedadMarkdown,
} from "./catalogo";
import { NOVEDADES_MARKDOWN } from "./entradas/embed";

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

  it("embed.ts está al día con los .md de entradas/ (pnpm gen:novedades-embed)", () => {
    const enDisco = readdirSync(directorioEntradasNovedades())
      .filter((f) => f.endsWith(".md"))
      .sort();
    expect(NOVEDADES_MARKDOWN).toHaveLength(enDisco.length);
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

  it("ordena por fecha y, dentro del mismo día, pone las destacadas arriba", () => {
    const base = { modulo: "core", titulo: "t", descripcion: "d", ruta: null, car: null, permiso: null, imagen: null };
    const a = { ...base, id: "a", fecha: "2026-11-10", destacada: false };
    const b = { ...base, id: "b", fecha: "2026-11-10", destacada: true };
    const c = { ...base, id: "c", fecha: "2026-11-11", destacada: false };
    expect([a, b, c].sort(compararNovedades).map((e) => e.id)).toEqual(["c", "b", "a"]);
  });

  it("CAR-248 (editar y descartar borradores) figura una sola vez y arriba de su día", () => {
    const items = catalogoNovedades();
    const ids = items.filter((i) => i.id === "editar-descartar-borradores");
    expect(ids).toHaveLength(1);
    const entrada = ids[0];
    expect(entrada?.permiso).toBe("finanzas:ventas.manage");
    const delDia = items.filter((i) => i.fecha === entrada?.fecha);
    expect(delDia[0]?.id).toBe("editar-descartar-borradores");
    const visibles = novedadesVisibles(items, ["finanzas"], (p) => p === "finanzas:ventas.manage", false);
    expect(visibles.some((i) => i.id === "editar-descartar-borradores")).toBe(true);
    const sinPermiso = novedadesVisibles(items, ["finanzas"], () => false, false);
    expect(sinPermiso.some((i) => i.id === "editar-descartar-borradores")).toBe(false);
  });
});
