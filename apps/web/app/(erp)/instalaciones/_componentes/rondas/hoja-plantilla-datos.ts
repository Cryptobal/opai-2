import type { OrdenPlantilla } from "@opai/domain";

import type { Plantilla, Punto } from "./tipos";

export type SelPunto = { incluido: boolean; orden: string; obligatorio: boolean };

/** Estado del formulario de plantilla: strings en numéricos; `sel` es la selección de puntos. */
export type DatosPlantilla = {
  nombre: string;
  ordenModo: OrdenPlantilla;
  tiempoMaxMin: string;
  tiempoMaxTramoMin: string;
  umbralIncompletaPct: string;
  permiteAdhoc: boolean;
  sel: Record<string, SelPunto>;
};

/** Datos iniciales: la plantilla existente (con su secuencia) o una nueva con los puntos sin incluir. */
export function inicialPlantilla(plantilla: Plantilla | null, puntos: readonly Punto[]): DatosPlantilla {
  const enPlantilla = new Map(plantilla?.puntos.map((p) => [p.puntoId, p]) ?? []);
  const sel: Record<string, SelPunto> = {};
  puntos.forEach((p, i) => {
    const ep = enPlantilla.get(p.id);
    sel[p.id] = {
      incluido: ep != null,
      orden: String(ep?.orden ?? i),
      obligatorio: ep?.obligatorio ?? true,
    };
  });
  return {
    nombre: plantilla?.nombre ?? "",
    ordenModo: plantilla?.ordenModo ?? "sugerido",
    tiempoMaxMin: plantilla ? String(plantilla.tiempoMaxMin) : "40",
    tiempoMaxTramoMin: plantilla?.tiempoMaxTramoMin != null ? String(plantilla.tiempoMaxTramoMin) : "",
    umbralIncompletaPct: plantilla ? String(plantilla.umbralIncompletaPct) : "20",
    permiteAdhoc: plantilla?.permiteAdhoc ?? true,
    sel,
  };
}

/** Puntos incluidos, ordenados por su `orden`. */
export function puntosElegidos(d: DatosPlantilla) {
  return Object.entries(d.sel)
    .filter(([, s]) => s.incluido)
    .map(([puntoId, s]) => ({ puntoId, orden: Number.parseInt(s.orden, 10) || 0, obligatorio: s.obligatorio }))
    .sort((a, b) => a.orden - b.orden);
}

/** Convierte el formulario al input de `rondas.plantillas.crear/actualizar`. */
export function plantillaAInput(d: DatosPlantilla, instalacionId: string, id: string | null) {
  const tramo = d.tiempoMaxTramoMin.trim();
  const base: Record<string, unknown> = {
    nombre: d.nombre.trim(),
    ordenModo: d.ordenModo,
    tiempoMaxMin: Number.parseInt(d.tiempoMaxMin, 10) || 0,
    umbralIncompletaPct: Number.parseInt(d.umbralIncompletaPct, 10) || 0,
    permiteAdhoc: d.permiteAdhoc,
    puntos: puntosElegidos(d),
  };
  // Vacío: al crear se omite (sin tramo); al editar se envía null para borrarlo.
  if (tramo !== "") base["tiempoMaxTramoMin"] = Number.parseInt(tramo, 10);
  else if (id) base["tiempoMaxTramoMin"] = null;
  return id ? { id, ...base } : { instalacionId, ...base };
}
