/**
 * Specs @preview que bloquean preview-e2e según archivos tocados (CAR-511, CAR-807).
 */
import { readdirSync } from "node:fs";
import { basename, join } from "node:path";

const E2E_DIR = join(import.meta.dirname, "../apps/web/e2e");

export function segmentosApp(ruta: string): string[] {
  const m = ruta.match(/^apps\/web\/app\/(?:\([^)]+\)\/)?(.+)/);
  if (!m) return [];
  return m[1]
    .replace(/\/page\.tsx$/, "")
    .split("/")
    .filter((s) => s.length > 2 && !s.startsWith("_"));
}

export function especRelacionadoConArchivo(
  archivo: string,
  todosLosSpecs: string[],
): string[] {
  const nombre = basename(archivo);
  if (archivo.startsWith("apps/web/e2e/") && nombre.endsWith(".spec.ts")) {
    return [nombre];
  }
  const claves: string[] = [];
  if (archivo.startsWith("apps/web/app/")) {
    claves.push(...segmentosApp(archivo));
  }
  if (archivo.startsWith("packages/ds/")) {
    const parte = basename(archivo).replace(/\.[^.]+$/, "");
    if (parte.length > 2) claves.push(parte);
    claves.push("ds");
  }
  if (claves.length === 0) return [];
  const relacionados: string[] = [];
  for (const spec of todosLosSpecs) {
    const base = basename(spec, ".spec.ts").toLowerCase();
    if (claves.some((c) => base.includes(c.toLowerCase()))) {
      relacionados.push(basename(spec));
    }
  }
  return relacionados;
}

export function especsRelacionados(archivos: string[]): Set<string> {
  let todos: string[] = [];
  try {
    todos = readdirSync(E2E_DIR).filter((f) => f.endsWith(".spec.ts"));
  } catch {
    return new Set();
  }
  const out = new Set<string>();
  for (const archivo of archivos) {
    for (const spec of especRelacionadoConArchivo(archivo, todos)) {
      out.add(spec);
    }
  }
  return out;
}