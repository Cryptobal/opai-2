import { readdirSync } from "node:fs";
import { join, relative } from "node:path";

import { herramientasMcp, nombreHerramienta } from "../src/mcp";
import { EXCEPCIONES_PARIDAD } from "./paridad-excepciones";
import {
  contextoPlataformaAgente,
  fuentesWeb,
  llamadasAEjecutores,
  RAIZ_WEB,
} from "./paridad-util";

/** Fila del inventario: pantalla (portal y ruta) → capacidad → herramienta MCP → estado. */
export type FilaInventario = {
  portal: string;
  ruta: string;
  capacidad: string;
  herramienta: string;
  estado: "existe" | "excepción" | "falta";
};

/** Portal y ruta (sin grupos ni carpetas privadas) de un archivo de apps/web. */
export function pantallaDe(archivo: string): { portal: string; ruta: string } {
  if (archivo.startsWith("lib/")) return { portal: "servidor", ruta: archivo };
  const partes = archivo
    .replace(/^app\//, "")
    .split("/")
    .slice(0, -1);
  const privada = partes.findIndex((p) => p.startsWith("_"));
  if (privada !== -1)
    return { portal: "compartido", ruta: `app/${partes.slice(0, privada + 1).join("/")}` };
  const grupo = partes.find((p) => /^\(.+\)$/.test(p));
  const ruta = `/${partes.filter((p) => !/^\(.+\)$/.test(p)).join("/")}`;
  return { portal: grupo ? grupo.slice(1, -1) : "—", ruta };
}

/** Inventario de lo que la UI invoca, con la herramienta MCP de una key de plataforma (ADR-055). */
export function inventario(): FilaInventario[] {
  const herramientas = new Set(
    herramientasMcp(contextoPlataformaAgente()).map((h) => h.capacidad.id),
  );
  const filas = new Map<string, FilaInventario>();
  for (const { archivo, ids } of llamadasAEjecutores()) {
    for (const capacidad of ids) {
      const { portal, ruta } = pantallaDe(archivo);
      const estado = herramientas.has(capacidad)
        ? "existe"
        : capacidad in EXCEPCIONES_PARIDAD
          ? "excepción"
          : "falta";
      const herramienta = estado === "existe" ? nombreHerramienta(capacidad) : "—";
      filas.set(`${portal}|${ruta}|${capacidad}`, { portal, ruta, capacidad, herramienta, estado });
    }
  }
  return [...filas.values()].sort((a, b) =>
    `${a.portal}${a.ruta}${a.capacidad}`.localeCompare(`${b.portal}${b.ruta}${b.capacidad}`),
  );
}

/** Acciones `"use server"` exportadas (`archivo#funcion`) y rutas (`archivo`) de apps/web. */
export function entradasDeServidor(): string[] {
  const acciones = fuentesWeb()
    .filter(({ texto }) => /^\s*["']use server["']/.test(texto))
    .flatMap(({ archivo, texto }) =>
      [...texto.matchAll(/export\s+async\s+function\s+(\w+)/g)].map((m) => `${archivo}#${m[1]}`),
    );
  const rutas = rutasDe(join(RAIZ_WEB, "app")).map((r) =>
    relative(RAIZ_WEB, r).split("\\").join("/"),
  );
  return [...acciones, ...rutas].sort();
}

function rutasDe(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const ruta = join(dir, e.name);
    if (e.isDirectory()) return rutasDe(ruta);
    return e.name === "route.ts" ? [ruta] : [];
  });
}

/** Capacidades con herramienta MCP que ninguna pantalla invoca con id literal (solo API y MCP). */
export function soloPorMcp(filas: readonly FilaInventario[]): string[] {
  const enPantalla = new Set(filas.map((f) => f.capacidad));
  return herramientasMcp(contextoPlataformaAgente())
    .filter((h) => !h.dryRun && !enPantalla.has(h.capacidad.id))
    .map((h) => h.capacidad.id)
    .sort();
}
