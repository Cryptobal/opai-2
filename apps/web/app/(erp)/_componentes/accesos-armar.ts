import type { ItemFijado } from "@opai/ds";

export const MAXIMO_ACCESOS = 5;
export const MAXIMO_FIJADOS = 5;

/** Fijados primero y recientes después, sin repetir la ruta y hasta cinco (diseño de Inicio, §4.1.6). */
export function juntarAccesos(
  fijados: readonly ItemFijado[],
  recientes: readonly ItemFijado[],
): ItemFijado[] {
  const vistos = new Set<string>();
  const lista: ItemFijado[] = [];
  for (const i of [...fijados, ...recientes]) {
    if (vistos.has(i.href)) continue;
    vistos.add(i.href);
    lista.push(i);
  }
  return lista.slice(0, MAXIMO_ACCESOS);
}
