import { type ModuleManifest } from "@opai/capabilities";
import { AREAS_NAV, type AreaNav, esAreaNav, ETIQUETA_AREA } from "@opai/domain";

import type { Seccion } from "./secciones";
import { SECCIONES_MODULO } from "./secciones-modulos";

export type AreaMenuModulo = Exclude<AreaNav, "inicio">;

const AREAS_MODULOS: readonly AreaMenuModulo[] = AREAS_NAV.filter(
  (a): a is AreaMenuModulo => a !== "inicio",
);

/** Área del menú ERP donde vive el módulo (primera entrada `portal: erp` del manifest). */
export function areaMenuDeModulo(manifest: ModuleManifest): AreaMenuModulo {
  const erp = manifest.navegacion.find((n) => n.portal === "erp" && n.area);
  const area = erp?.area;
  if (area && esAreaNav(area) && area !== "inicio") return area;
  return "operaciones";
}

/** El módulo expone pestañas de configuración o campos de ajuste en el manifest. */
export function moduloConAjustesVisibles(moduloId: string, conAjustesManifest: Set<string>): boolean {
  return conAjustesManifest.has(moduloId) || (SECCIONES_MODULO[moduloId]?.length ?? 0) > 0;
}

const compararModulos = (a: Seccion, b: Seccion) => {
  const areaA = AREAS_MODULOS.indexOf((a.areaMenu as AreaMenuModulo | undefined) ?? "operaciones");
  const areaB = AREAS_MODULOS.indexOf((b.areaMenu as AreaMenuModulo | undefined) ?? "operaciones");
  if (areaA !== areaB) return areaA - areaB;
  return a.titulo.localeCompare(b.titulo, "es");
};

/** Deja las entradas de módulos contratados (`modulo-*`) al final del grupo Módulos, ordenadas por área. */
export function ordenarEntradasModulosContratados(secciones: readonly Seccion[]): Seccion[] {
  const mods = secciones.filter((s) => s.grupo === "modulos" && s.id.startsWith("modulo-"));
  if (mods.length === 0) return [...secciones];
  const modsOrd = [...mods].sort(compararModulos);
  const resto = secciones.filter((s) => !(s.grupo === "modulos" && s.id.startsWith("modulo-")));
  return [...resto, ...modsOrd];
}

export { AREAS_MODULOS, ETIQUETA_AREA };