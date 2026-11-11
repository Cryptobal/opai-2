import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PARTES_FINANZAS } from "../cobros/catalogo-modulos";
import { NOVEDADES_MARKDOWN } from "./entradas/embed";
import { parsearNovedadMarkdown, type EntradaNovedad } from "./parser";

export { parsearNovedadMarkdown, type EntradaNovedad, type FrontmatterNovedad } from "./parser";

const dirEntradas = join(dirname(fileURLToPath(import.meta.url)), "entradas");

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

/**
 * Orden del catálogo: la fecha más nueva primero; dentro del mismo día, las
 * destacadas arriba (la fecha no tiene hora, y sin esto el orden dentro del día
 * dependía del nombre del archivo). Empates restantes: orden estable del embed.
 */
export function compararNovedades(a: EntradaNovedad, b: EntradaNovedad): number {
  if (a.fecha !== b.fecha) return a.fecha < b.fecha ? 1 : -1;
  if (a.destacada !== b.destacada) return a.destacada ? -1 : 1;
  return 0;
}

function cargarCatalogo(): EntradaNovedad[] {
  const entradas = NOVEDADES_MARKDOWN.map((texto) => parsearNovedadMarkdown(texto));
  const ids = new Set<string>();
  for (const e of entradas) {
    if (ids.has(e.id)) throw new Error(`id de novedad duplicado: ${e.id}`);
    ids.add(e.id);
  }
  return entradas.sort(compararNovedades);
}

/** Catálogo de novedades integradas en main (archivos en `entradas/`). */
export function catalogoNovedades(): readonly EntradaNovedad[] {
  cache ??= cargarCatalogo();
  return cache;
}

/** Directorio de entradas en el árbol fuente (solo tests/desarrollo). */
export function directorioEntradasNovedades(): string {
  return dirEntradas;
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
