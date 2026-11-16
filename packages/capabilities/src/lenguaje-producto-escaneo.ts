import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { hallarLenguajeInterno } from "./lenguaje-producto";

/** Cadenas que no son lenguaje de producto aunque coincidan con un patrón (semver, XML, etc.). */
export function ignorarCadenaVisible(texto: string): boolean {
  const t = texto.trim();
  if (!t) return true;
  if (/^\d+\.\d+\.\d+$/.test(t)) return true;
  if (t.startsWith('<?xml version="1.0"')) return true;
  if (/^opai1$/i.test(t)) return true;
  return false;
}

function quitarComentarios(fuente: string): string {
  return fuente
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

/** Extrae literales simples `"…"`, `'…'` y `` `…` `` (sin anidar). */
function extraerLiterales(fuente: string): string[] {
  const sin = quitarComentarios(fuente);
  const out: string[] = [];
  const re = /(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;
  for (const m of sin.matchAll(re)) {
    const s = m[2] ?? "";
    if (s.length >= 2) out.push(s);
  }
  return out;
}

const RAIZ_REPO = join(import.meta.dirname, "../../..");

function rutaRepo(absoluta: string): string {
  return relative(RAIZ_REPO, absoluta).replace(/\\/g, "/");
}

function recorrer(
  dir: string,
  extensiones: readonly string[],
  omitirRuta: (rel: string) => boolean,
  porArchivo: (rel: string, literales: string[]) => void,
): void {
  for (const nombre of readdirSync(dir)) {
    const absoluta = join(dir, nombre);
    const rel = rutaRepo(absoluta);
    if (omitirRuta(rel) || rel.includes("/node_modules/")) continue;
    const st = statSync(absoluta);
    if (st.isDirectory()) recorrer(absoluta, extensiones, omitirRuta, porArchivo);
    else if (extensiones.some((e) => nombre.endsWith(e))) {
      const literales = extraerLiterales(readFileSync(absoluta, "utf8"));
      porArchivo(rel, literales);
    }
  }
}

function fallosEnLiterales(rel: string, literales: readonly string[]): string[] {
  const errores: string[] = [];
  for (const lit of literales) {
    if (ignorarCadenaVisible(lit)) continue;
    const id = hallarLenguajeInterno(lit);
    if (id) errores.push(`${rel}: patrón «${id}» en «${lit.slice(0, 80)}${lit.length > 80 ? "…" : ""}»`);
  }
  return errores;
}

export function escanearDirectorio(
  subruta: string,
  extensiones: readonly string[],
  omitirRuta: (rel: string) => boolean,
): string[] {
  const errores: string[] = [];
  recorrer(join(RAIZ_REPO, subruta), extensiones, omitirRuta, (rel, lits) => {
    errores.push(...fallosEnLiterales(rel, lits));
  });
  return errores;
}