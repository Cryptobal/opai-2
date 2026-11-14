import type { BadgeProps } from "@opai/ds";

/** Visita de supervisión tal como la devuelve `pauta.visitas.listar` (fechas en ISO). */
export type Visita = {
  id: string;
  instalacionId: string;
  supervisor: string | null;
  estado: "en_curso" | "cerrada";
  iniciadaEn: string;
  cerradaEn: string | null;
  distanciaM: number | null;
  geocerca: "dentro" | "fuera" | "sin_gps" | "sin_ubicacion";
  checklist: {
    texto: string;
    resultado: "cumple" | "no_cumple" | "no_aplica";
    nota: string | null;
  }[];
  observaciones: string | null;
};

type Tono = NonNullable<BadgeProps["tono"]>;

export const LLEGADA: Record<Visita["geocerca"], { etiqueta: string; tono: Tono }> = {
  dentro: { etiqueta: "En la instalación", tono: "success" },
  fuera: { etiqueta: "Fuera de la geocerca", tono: "warning" },
  sin_gps: { etiqueta: "Sin GPS", tono: "neutro" },
  sin_ubicacion: { etiqueta: "Instalación sin ubicación", tono: "neutro" },
};

export const RESULTADO: Record<Visita["checklist"][number]["resultado"], string> = {
  cumple: "Cumple",
  no_cumple: "No cumple",
  no_aplica: "No aplica",
};

/** «Fuera de la geocerca · 420 m» o solo la etiqueta cuando no hay distancia. */
export function textoLlegada(v: Visita): string {
  const l = LLEGADA[v.geocerca].etiqueta;
  return v.distanciaM === null ? l : `${l} · ${v.distanciaM} m`;
}

/** «4 de 5 cumplen» sobre los ítems que aplican; vacío si la visita sigue en curso. */
export function resumenRevision(v: Visita): string {
  if (v.estado === "en_curso") return "En curso";
  const aplican = v.checklist.filter((i) => i.resultado !== "no_aplica");
  return `${aplican.filter((i) => i.resultado === "cumple").length} de ${aplican.length} cumplen`;
}
