import type { OrdenPlantilla } from "@opai/domain";

import type { Plantilla, PlantillaPunto, Punto } from "./tipos";

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
  // Puntos de la secuencia que ya se archivaron: la pantalla solo edita los activos, pero se
  // conservan para no borrarlos de la plantilla al guardar (la secuencia se reescribe completa).
  archivados: PlantillaPunto[];
};

/** Datos iniciales: la plantilla existente (con su secuencia) o una nueva con los puntos sin incluir. */
export function inicialPlantilla(plantilla: Plantilla | null, puntos: readonly Punto[]): DatosPlantilla {
  const enPlantilla = new Map(plantilla?.puntos.map((p) => [p.puntoId, p]) ?? []);
  const activos = new Set(puntos.map((p) => p.id));
  const sel: Record<string, SelPunto> = {};
  puntos.forEach((p, i) => {
    const ep = enPlantilla.get(p.id);
    sel[p.id] = {
      incluido: ep != null,
      orden: String(ep?.orden ?? i),
      obligatorio: ep?.obligatorio ?? true,
    };
  });
  // La secuencia referencia puntos ya archivados (no aparecen en `puntos`, que son los activos);
  // se guardan aparte para reinsertarlos al guardar y no perderlos.
  const archivados = (plantilla?.puntos ?? []).filter((p) => !activos.has(p.puntoId));
  return {
    nombre: plantilla?.nombre ?? "",
    ordenModo: plantilla?.ordenModo ?? "sugerido",
    tiempoMaxMin: plantilla ? String(plantilla.tiempoMaxMin) : "40",
    tiempoMaxTramoMin: plantilla?.tiempoMaxTramoMin != null ? String(plantilla.tiempoMaxTramoMin) : "",
    umbralIncompletaPct: plantilla ? String(plantilla.umbralIncompletaPct) : "20",
    permiteAdhoc: plantilla?.permiteAdhoc ?? true,
    sel,
    archivados: archivados.map((p) => ({ ...p })),
  };
}

/** Puntos activos incluidos, ordenados por su `orden`. */
export function puntosElegidos(d: DatosPlantilla) {
  return Object.entries(d.sel)
    .filter(([, s]) => s.incluido)
    .map(([puntoId, s]) => ({ puntoId, orden: Number.parseInt(s.orden, 10) || 0, obligatorio: s.obligatorio }))
    .sort((a, b) => a.orden - b.orden);
}

/** Secuencia a guardar: los activos elegidos más los archivados, renumerados sin colisiones de orden. */
export function secuenciaAGuardar(d: DatosPlantilla): PlantillaPunto[] {
  const activos = puntosElegidos(d);
  if (d.archivados.length === 0) return activos;
  return [...activos, ...d.archivados]
    .sort((a, b) => a.orden - b.orden)
    .map((p, i) => ({ puntoId: p.puntoId, orden: i, obligatorio: p.obligatorio }));
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
    puntos: secuenciaAGuardar(d),
  };
  // Vacío: al crear se omite (sin tramo); al editar se envía null para borrarlo.
  if (tramo !== "") base["tiempoMaxTramoMin"] = Number.parseInt(tramo, 10);
  else if (id) base["tiempoMaxTramoMin"] = null;
  return id ? { id, ...base } : { instalacionId, ...base };
}
