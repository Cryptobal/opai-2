import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { subtituloMarcaPortal, tituloNoEncontrado } from "@/app/_components/portales";
import { RutaInexistente } from "@/app/_components/ruta-inexistente";

const APP = join(import.meta.dirname, "..", "app");

/** Carpetas `[id]` / `[evento]` / `[proveedor]` con página, bajo `(erp)`. */
function fichas(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (!e.isDirectory()) return [];
    const ruta = join(dir, e.name);
    const propia = /^\[(?!\.\.\.)[^\]]+\]$/.test(e.name) && existsSync(join(ruta, "page.tsx"));
    return [...(propia ? [ruta] : []), ...fichas(ruta)];
  });
}

describe("404 con shell, en español y con enlace para volver", () => {
  it("el catch-all llama a notFound() sin leer params (responde HTTP 404 antes del streaming)", () => {
    expect(() => RutaInexistente()).toThrow(/NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/);
  });

  it("toda ficha [id] del ERP tiene su not-found con el shell (no la página genérica de Next)", () => {
    const sin = fichas(join(APP, "(erp)")).filter((d) => !existsSync(join(d, "not-found.tsx")));
    expect(sin).toEqual([]);
  });

  it("cada portal tiene su catch-all y su not-found", () => {
    const portales = [
      "(erp)",
      "(cliente)/cliente",
      "(platform)/platform",
      "(supervisor)/supervisor",
      "(terreno)/terreno",
      "(trabajador)/trabajador",
    ];
    for (const p of portales) {
      const base = join(APP, p);
      expect(existsSync(join(base, "[...ruta]", "page.tsx")), p).toBe(true);
      expect(existsSync(join(base, "[...ruta]", "not-found.tsx")), p).toBe(true);
    }
  });
});

describe("el 404 nombra el portal", () => {
  it("cada portal tiene un título de 404 distinto y el de Trabajador y Cliente los nombra", () => {
    const ids = ["erp", "supervisor", "trabajador", "terreno", "cliente", "platform"];
    const titulos = ids.map(tituloNoEncontrado);
    expect(new Set(titulos).size).toBe(ids.length);
    expect(tituloNoEncontrado("trabajador")).toBe("Portal Trabajador · No encontrado");
    expect(tituloNoEncontrado("cliente")).toBe("Portal Cliente · No encontrado");
    expect(tituloNoEncontrado("erp")).toBe("No encontrado");
  });

  it("el lateral lleva el nombre del portal como subtítulo de la marca (salvo el ERP)", () => {
    expect(subtituloMarcaPortal("trabajador")).toBe("Trabajador");
    expect(subtituloMarcaPortal("cliente")).toBe("Cliente");
    expect(subtituloMarcaPortal("platform")).toBe("Plataforma");
    expect(subtituloMarcaPortal("erp")).toBeUndefined();
  });

  it("el not-found de cada portal usa el título con el nombre del portal", () => {
    for (const p of [
      "(cliente)/cliente",
      "(trabajador)/trabajador",
      "(terreno)/terreno",
      "(supervisor)/supervisor",
      "(platform)/platform",
    ]) {
      const src = readFileSync(join(APP, p, "[...ruta]", "not-found.tsx"), "utf8");
      expect(src, p).toContain("tituloNoEncontrado(");
    }
  });
});
