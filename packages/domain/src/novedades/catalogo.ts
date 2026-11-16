import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PARTES_FINANZAS } from "../cobros/catalogo-modulos";
import { accesoDeRuta, type AccesoRuta } from "./acceso-ruta";
import { NOVEDADES_MARKDOWN } from "./entradas/embed";
import { parsearNovedadMarkdown, type EntradaNovedad } from "./parser";

export { accesoDeRuta, type AccesoRuta } from "./acceso-ruta";
export { parsearNovedadMarkdown, type EntradaNovedad, type FrontmatterNovedad } from "./parser";
export {
  bloquesNovedad,
  hrefSeguroNovedad,
  textoPlanoNovedad,
  trozosNovedad,
  type BloqueNovedad,
  type TrozoNovedad,
} from "./formato";

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

const moduloActivo = (modulo: string, activos: ReadonlySet<string>) =>
  modulo === "finanzas" ? activosFinanzas(activos) : activos.has(modulo);

/**
 * Filtra entradas visibles para el tenant y los permisos del actor. Con `tabla` (CAR-430), una
 * novedad sin permiso propio se recorta además por la pantalla a la que lleva: si la persona no
 * ve esa entrada del menú (módulo apagado o sin su permiso), tampoco ve la novedad.
 */
export function novedadesVisibles(
  entradas: readonly EntradaNovedad[],
  modulosActivos: readonly string[],
  puede: (permiso: string) => boolean,
  esPlataforma: boolean,
  tabla: readonly AccesoRuta[] = [],
): EntradaNovedad[] {
  // «personas» es parte del núcleo, no un módulo vendible: sus entradas se ven con el núcleo.
  const activos = new Set(["core", "personas", ...modulosActivos]);
  return entradas.filter((e) => {
    if (e.modulo === "platform") return esPlataforma;
    if (e.modulo !== "core" && !moduloActivo(e.modulo, activos)) return false;
    if (e.permiso) return puede(e.permiso);
    const acceso = e.ruta ? accesoDeRuta(e.ruta, tabla) : undefined;
    if (!acceso) return true;
    if (!moduloActivo(acceso.modulo, activos)) return false;
    return !acceso.permiso || puede(acceso.permiso);
  });
}
