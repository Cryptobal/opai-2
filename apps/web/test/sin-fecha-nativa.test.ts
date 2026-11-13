/// <reference types="node" />
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

// CAR-368 (regla R5 de DISENO-hilo.md): las fechas se escriben y se ven como dd-mm-aaaa. El campo
// de fecha nativo del navegador muestra «mm/dd/yyyy» en un equipo en inglés; las pantallas usan
// `InputFecha` (o `CampoFechaEscrita` / `InputFechaRango`) de `@opai/ds`.
const raiz = new URL("../../../", import.meta.url).pathname;

function archivos(dir: string, salida: string[] = []): string[] {
  if (!existsSync(dir)) return salida;
  for (const n of readdirSync(dir)) {
    if (n === "node_modules" || n === ".next" || n === "test" || n === "e2e") continue;
    const ruta = join(dir, n);
    if (statSync(ruta).isDirectory()) archivos(ruta, salida);
    else if (/\.tsx$/.test(n)) salida.push(ruta);
  }
  return salida;
}

describe("sin campo de fecha nativo en pantallas", () => {
  it('ninguna pantalla usa type="date"', () => {
    const bases = ["apps/web/app", "apps/web/components", "modules"].map((d) => join(raiz, d));
    const fallas = bases
      .flatMap((b) => archivos(b))
      .filter((f) => /type=\{?["']date["']\}?/.test(readFileSync(f, "utf8")))
      .map((f) => relative(raiz, f));
    expect(fallas).toEqual([]);
  });
});
