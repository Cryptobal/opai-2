import type { LucideIcon } from "lucide-react";

import { agrupar } from "./sidebar-item";
import { iconoDeAreaMas } from "./mas-iconos";
import { esActivo, type NavItem } from "./types";

export type AreaMas = {
  id: string;
  nombre: string;
  icono: LucideIcon;
  entradas: NavItem[];
  /** La página actual está dentro del área. */
  activa: boolean;
};

export type EstructuraMas = { sueltas: NavItem[]; areas: AreaMas[]; pie: NavItem[] };

/** Reparte las entradas de «Más»: sueltas (sin área), áreas en su orden y la entrada fija al pie. */
export function estructuraMas(items: readonly NavItem[], rutaActual: string): EstructuraMas {
  const sueltas: NavItem[] = [];
  const areas: AreaMas[] = [];
  for (const [grupo, lista] of agrupar(items.filter((i) => !i.pie))) {
    if (!grupo) {
      sueltas.push(...lista);
      continue;
    }
    const id = lista[0]?.area ?? grupo;
    areas.push({
      id,
      nombre: grupo,
      icono: iconoDeAreaMas(id),
      entradas: lista,
      activa: lista.some((i) => esActivo(rutaActual, i.href, i.exacta, i.activoEn)),
    });
  }
  return { sueltas, areas, pie: items.filter((i) => i.pie) };
}

/** Un área con una sola entrada no se pliega: el encabezado y la entrada van en una misma fila. */
export const esAreaSuelta = (a: AreaMas) => a.entradas.length === 1;

/** Áreas abiertas al montar: las que la persona dejó abiertas más el área de la página actual. */
export function areasAbiertasIniciales(
  areas: readonly AreaMas[],
  guardadas: readonly string[] | null,
): Set<string> {
  const abiertas = new Set((guardadas ?? []).filter((id) => areas.some((a) => a.id === id)));
  for (const a of areas) if (a.activa) abiertas.add(a.id);
  return abiertas;
}

const clave = (epoca: string) => `opai_mas_areas_${epoca}`;

/** Preferencia de interfaz por usuario y empresa (`epoca`), en el navegador como los recientes. */
export function leerAreasAbiertas(epoca: string | undefined): string[] | null {
  if (!epoca) return null;
  try {
    const crudo = localStorage.getItem(clave(epoca));
    const datos: unknown = crudo ? JSON.parse(crudo) : null;
    return Array.isArray(datos)
      ? datos.filter((d): d is string => typeof d === "string" && d.length <= 40).slice(0, 12)
      : null;
  } catch {
    return null;
  }
}

export function guardarAreasAbiertas(epoca: string | undefined, abiertas: ReadonlySet<string>) {
  if (!epoca) return;
  try {
    localStorage.setItem(clave(epoca), JSON.stringify([...abiertas]));
  } catch {
    // Modo privado u otro bloqueo: el menú sigue funcionando sin recordar.
  }
}
