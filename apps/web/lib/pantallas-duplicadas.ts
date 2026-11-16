import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { PANTALLAS_PARIDAD_PORTAL, rutaCanonica } from "./rutas-alias-pantalla";

const APP = join(dirname(fileURLToPath(import.meta.url)), "../app");

export type HallazgoPantalla = { rutas: string[]; huella: string };

function paginasApp(): { ruta: string; cuerpo: string }[] {
  const paginas: { ruta: string; cuerpo: string }[] = [];
  const walk = (dir: string) => {
    for (const nombre of readdirSync(dir)) {
      const p = join(dir, nombre);
      if (statSync(p).isDirectory()) walk(p);
      else if (nombre === "page.tsx") {
        const rel = relative(APP, join(dir, ""));
        const ruta =
          "/" +
          rel
            .replace(/\([^)]+\)\//g, "")
            .split("/")
            .map((s) => s.replace(/^\[\.\.\.(\w+)\]$/, ":$1..."))
            .map((s) => s.replace(/^\[(\w+)\]$/, ":$1"))
            .join("/");
        paginas.push({ ruta, cuerpo: readFileSync(p, "utf8") });
      }
    }
  };
  walk(APP);
  return paginas;
}

function soloRedirige(cuerpo: string): boolean {
  return (
    /\b(permanentRedirect|redirect)\s*\(/.test(cuerpo) &&
    !/<PaginaConfig/.test(cuerpo) &&
    !/<PaginaPortal/.test(cuerpo)
  );
}

function huellaPantalla(cuerpo: string, ruta: string): string {
  const fn = cuerpo.match(/export default function (\w+)/)?.[1] ?? "?";
  const pagina = cuerpo.match(/<(PaginaConfig|PaginaPortal|Pagina[A-Z][^\s>]*)/)?.[1] ?? "";
  const seccion = cuerpo.match(/seccion="([^"]+)"/)?.[1] ?? "";
  const rutaProp = cuerpo.match(/ruta="([^"]+)"/)?.[1] ?? "";
  const imports = [...cuerpo.matchAll(/from "(@\/[^"]+|\.\.?\/[^"]+)"/g)]
    .map((m) => m[1]!)
    .filter((i) => i.includes("_componentes/") || i.includes("pagina-"))
    .sort()
    .join("|");
  return [fn, pagina, seccion, rutaProp || ruta, imports].join("::");
}

function enParidadPortal(ruta: string): boolean {
  return PANTALLAS_PARIDAD_PORTAL.some((p) => p.patron.test(ruta));
}

/** Agrupa rutas que montan la misma pantalla sin alias declarado. */
export function pantallasDuplicadasNoDeclaradas(): HallazgoPantalla[] {
  const porHuella = new Map<string, string[]>();
  for (const { ruta, cuerpo } of paginasApp()) {
    if (soloRedirige(cuerpo)) continue;
    const canon = rutaCanonica(ruta);
    if (canon !== ruta) continue;
    if (enParidadPortal(ruta)) continue;
    const h = huellaPantalla(cuerpo, ruta);
    if (!porHuella.has(h)) porHuella.set(h, []);
    porHuella.get(h)!.push(ruta);
  }

  return [...porHuella.entries()]
    .filter(([, rutas]) => rutas.length > 1)
    .filter(([, rutas]) => !rutas.every((r) => r.includes(":")))
    .map(([huella, rutas]) => ({ huella, rutas: rutas.sort() }));
}