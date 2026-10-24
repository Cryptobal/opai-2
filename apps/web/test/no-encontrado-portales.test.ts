import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

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
    const portales = ["(erp)", "(cliente)/cliente", "(platform)/platform", "(supervisor)/supervisor", "(terreno)/terreno", "(trabajador)/trabajador"];
    for (const p of portales) {
      const base = join(APP, p);
      expect(existsSync(join(base, "[...ruta]", "page.tsx")), p).toBe(true);
      expect(existsSync(join(base, "[...ruta]", "not-found.tsx")), p).toBe(true);
    }
  });
});
