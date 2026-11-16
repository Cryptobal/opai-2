import type { FiltroNovedades } from "./encabezado-novedades";
import { etiquetaModuloVisible, type ItemModuloNovedad } from "./modulo-novedad";
import type { ItemNovedad } from "./tarjeta-novedad";

export const MODULO_TODOS = "todos";

export function modulosConNovedades(items: readonly ItemNovedad[]): string[] {
  const vistos = new Set<string>();
  const modulos: string[] = [];
  for (const item of items) {
    const etiqueta = etiquetaModuloVisible(item);
    if (vistos.has(etiqueta)) continue;
    vistos.add(etiqueta);
    modulos.push(etiqueta);
  }
  return modulos.sort((a, b) => a.localeCompare(b, "es"));
}

function coincideModulo(item: ItemModuloNovedad, modulo: string): boolean {
  return modulo === MODULO_TODOS || etiquetaModuloVisible(item) === modulo;
}

export function contarNoLeidas(
  items: readonly ItemNovedad[],
  modulo: string,
): number {
  return items.filter((item) => !item.leida && coincideModulo(item, modulo)).length;
}

export function filtrarItems({
  items,
  filtro,
  modulo,
  leidasAqui,
}: {
  items: readonly ItemNovedad[];
  filtro: FiltroNovedades;
  modulo: string;
  leidasAqui: ReadonlySet<string>;
}): ItemNovedad[] {
  return items.filter((item) => {
    if (!coincideModulo(item, modulo)) return false;
    if (filtro === "todas") return true;
    return !item.leida || leidasAqui.has(item.id);
  });
}

export function idsNoLeidasFiltradas(
  items: readonly ItemNovedad[],
  modulo: string,
): string[] {
  return items.filter((item) => !item.leida && coincideModulo(item, modulo)).map((i) => i.id);
}