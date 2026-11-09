import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PARTES_FINANZAS } from "../cobros/catalogo-modulos";
import { parsearNovedadMarkdown, type EntradaNovedad } from "./parser";

export { parsearNovedadMarkdown, type EntradaNovedad, type FrontmatterNovedad } from "./parser";

const dir = join(dirname(fileURLToPath(import.meta.url)), "entradas");

let cache: EntradaNovedad[] | null = null;

/** Nombres amigables del módulo para la interfaz. */
export const ETIQUETA_MODULO_NOVEDAD: Readonly<Record<string, string>> = {
  core: "Núcleo",
  comercial: "Comercial",
  cpq: "CPQ",
  finanzas: "Finanzas",
  documentos: "Documentos",
  pauta: "Operaciones",
  tickets: "Tickets",
  rendiciones: "Rendiciones",
  plataforma: "Plataforma",
};

function cargarDesdeDisco(): EntradaNovedad[] {
  const archivos = readdirSync(dir).filter((f) => f.endsWith(".md"));
  const entradas = archivos.map((f) => parsearNovedadMarkdown(readFileSync(join(dir, f), "utf8")));
  const ids = new Set<string>();
  for (const e of entradas) {
    if (ids.has(e.id)) throw new Error(`id de novedad duplicado: ${e.id}`);
    ids.add(e.id);
  }
  return entradas.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
}

/** Catálogo de novedades integradas en main (archivos en `entradas/`). */
export function catalogoNovedades(): readonly EntradaNovedad[] {
  cache ??= cargarDesdeDisco();
  return cache;
}

/** Invalida el caché (solo tests). */
export function reiniciarCatalogoNovedades(): void {
  cache = null;
}

const activosFinanzas = (modulos: ReadonlySet<string>) =>
  modulos.has("finanzas") || PARTES_FINANZAS.some((p) => modulos.has(p));

/** Filtra entradas visibles para el tenant y los permisos del actor. */
export function novedadesVisibles(
  entradas: readonly EntradaNovedad[],
  modulosActivos: readonly string[],
  puede: (permiso: string) => boolean,
  esPlataforma: boolean,
): EntradaNovedad[] {
  const activos = new Set(["core", ...modulosActivos]);
  return entradas.filter((e) => {
    if (e.modulo === "platform") return esPlataforma;
    if (e.modulo === "core") return true;
    if (e.modulo === "finanzas") {
      if (!activosFinanzas(activos)) return false;
    } else if (!activos.has(e.modulo)) return false;
    if (e.permiso && !puede(e.permiso)) return false;
    return true;
  });
}
