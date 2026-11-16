import type { CampoAjuste } from "./registro";
import { normalizarEtiqueta } from "./normalizar-etiqueta";

export type DuplicadoAjustes = {
  mismaClave: { clave: string; modulos: string[] }[];
  mismaEtiqueta: { etiqueta: string; ids: string[] }[];
};

/** Detecta claves o etiquetas repetidas entre módulos distintos. */
export function duplicadosAjustes(campos: readonly CampoAjuste[]): DuplicadoAjustes {
  const porClave = new Map<string, Set<string>>();
  const porEtiqueta = new Map<string, Set<string>>();

  for (const c of campos) {
    const id = `${c.modulo}.${c.clave}`;
    if (!porClave.has(c.clave)) porClave.set(c.clave, new Set());
    porClave.get(c.clave)!.add(c.modulo);
    const norm = normalizarEtiqueta(c.meta.etiqueta);
    if (!porEtiqueta.has(norm)) porEtiqueta.set(norm, new Set());
    porEtiqueta.get(norm)!.add(id);
  }

  const mismaClave = [...porClave.entries()]
    .filter(([, mods]) => mods.size > 1)
    .map(([clave, mods]) => ({ clave, modulos: [...mods].sort() }));

  const mismaEtiqueta = [...porEtiqueta.entries()]
    .filter(([, ids]) => new Set([...ids].map((x) => x.split(".")[0])).size > 1)
    .map(([etiqueta, ids]) => ({ etiqueta, ids: [...ids].sort() }));

  return { mismaClave, mismaEtiqueta };
}