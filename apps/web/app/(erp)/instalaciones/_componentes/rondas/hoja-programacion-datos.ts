import type { Programacion } from "./tipos";

/** Estado del formulario de programación. En el PR 1b los horarios son horas fijas "HH:MM". */
export type DatosProgramacion = {
  nombre: string;
  plantillaId: string;
  horarios: string[];
  dias: number[];
  vigenciaDesde: string;
  vigenciaHasta: string;
  toleranciaMin: string;
};

/** Datos iniciales desde una programación existente o una nueva con una hora por defecto. */
export function inicialProgramacion(p: Programacion | null, plantillaId: string): DatosProgramacion {
  const horas = p?.horarios.filter((h): h is string => typeof h === "string") ?? [];
  return {
    nombre: p?.nombre ?? "",
    plantillaId: p?.plantillaId ?? plantillaId,
    horarios: horas.length > 0 ? horas : ["08:00"],
    dias: p?.diasSemana ? [...p.diasSemana] : [1, 2, 3, 4, 5],
    vigenciaDesde: p?.vigenciaDesde ?? "",
    vigenciaHasta: p?.vigenciaHasta ?? "",
    toleranciaMin: p ? String(p.toleranciaMin) : "15",
  };
}

/** Convierte el formulario al input de `rondas.programaciones.fijar`. */
export function programacionAInput(d: DatosProgramacion, instalacionId: string, id: string | null) {
  const base = {
    instalacionId,
    plantillaId: d.plantillaId,
    nombre: d.nombre.trim(),
    horarios: d.horarios.filter((h) => h.trim() !== ""),
    diasSemana: [...d.dias].sort((a, b) => a - b),
    vigenciaDesde: d.vigenciaDesde || null,
    vigenciaHasta: d.vigenciaHasta || null,
    toleranciaMin: Number.parseInt(d.toleranciaMin, 10) || 0,
    // El PR 1b fija responsables «quien esté de turno»; la asignación nominal llega después.
    responsables: { modo: "por_turno" as const, personaIds: [] as string[] },
  };
  return id ? { id, ...base } : base;
}
