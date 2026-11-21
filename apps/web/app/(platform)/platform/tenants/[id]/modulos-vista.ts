import { AREAS_NAV, ETIQUETA_AREA, type AreaNav } from "@opai/domain";

import type { DetalleTenant } from "./tipos";

export type FilaModulo = DetalleTenant["modulos"][number];

export const TEXTO_ESTADO: Record<string, string> = {
  activo: "Activo",
  trial: "En prueba",
  solo_lectura: "Solo lectura",
  suspendido: "Suspendido",
};

export const activoParaUso = (estado: string | null) =>
  estado === "activo" || estado === "trial" || estado === "solo_lectura";

export type GrupoModulos = { area: string; titulo: string; filas: FilaModulo[] };

/** Módulos raíz y complementos agrupados por área del menú (CAR-742). */
export function agruparModulosPorArea(modulos: readonly FilaModulo[]): GrupoModulos[] {
  const raices = modulos.filter((m) => !m.complemento);
  const hijos = new Map<string, FilaModulo[]>();
  for (const m of modulos) {
    if (!m.complemento || !m.padreId) continue;
    const lista = hijos.get(m.padreId) ?? [];
    lista.push(m);
    hijos.set(m.padreId, lista);
  }
  const porArea = new Map<string, FilaModulo[]>();
  const colocar = (m: FilaModulo) => {
    const clave = m.area ?? "otros";
    const lista = porArea.get(clave) ?? [];
    lista.push(m);
    for (const c of hijos.get(m.id) ?? []) lista.push(c);
    porArea.set(clave, lista);
  };
  for (const m of raices) colocar(m);
  const orden = [...AREAS_NAV, "otros"];
  return orden
    .map((a) => {
      const filas = porArea.get(a);
      if (!filas?.length) return null;
      const titulo = a === "otros" ? "Otros" : ETIQUETA_AREA[a as AreaNav];
      return { area: a, titulo, filas };
    })
    .filter((g): g is GrupoModulos => g != null);
}