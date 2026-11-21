import type { AreaNav } from "@opai/domain";

import { obtenerModulo } from "../module";

/** Área del menú ERP del módulo (primera entrada con área). */
export function areaDeModulo(moduloId: string): AreaNav | null {
  const m = obtenerModulo(moduloId);
  if (!m) return null;
  const nav = m.navegacion.find((n) => n.portal === "erp" && n.area != null);
  return (nav?.area as AreaNav) ?? null;
}