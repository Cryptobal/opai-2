/// <reference types="node" />
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// B2 (CAR-153): toda clase `t-*` o `text-muted*` usada en pantallas debe existir en el DS.
const raiz = new URL("../../../", import.meta.url).pathname;
const css = readFileSync(join(raiz, "packages/ds/src/styles.css"), "utf8");
const definidas = new Set([...css.matchAll(/@utility (t-[a-z0-9-]+)/g)].map((m) => m[1]!));

function archivos(dir: string, salida: string[] = []): string[] {
  if (!existsSync(dir)) return salida;
  for (const n of readdirSync(dir)) {
    if (n === "node_modules" || n === ".next" || n === "test") continue;
    const ruta = join(dir, n);
    if (statSync(ruta).isDirectory()) archivos(ruta, salida);
    else if (/\.tsx$/.test(n)) salida.push(ruta);
  }
  return salida;
}

describe("clases tipográficas del DS", () => {
  it("define las clases base", () => {
    expect(definidas.has("t-heading")).toBe(true);
  });

  it("ninguna pantalla usa clases t-* inexistentes ni text-muted", () => {
    const fallas: string[] = [];
    const bases = ["apps/web/app", "apps/web/components", "modules"].map((d) => join(raiz, d));
    for (const base of bases) {
      for (const f of archivos(base)) {
        const txt = readFileSync(f, "utf8");
        for (const m of txt.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
          for (const c of (m[1] ?? m[2] ?? "").split(/\s+/)) {
            if (/^t-[a-z0-9-]+$/.test(c) && !definidas.has(c)) fallas.push(`${f}: ${c}`);
            if (/^text-muted(-foreground)?$/.test(c)) fallas.push(`${f}: ${c}`);
          }
        }
      }
    }
    expect(fallas).toEqual([]);
  });
});
