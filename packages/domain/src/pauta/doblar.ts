import { diaNumero, minutosDeHora, rangoDias } from "./fechas";
import { trabajaEn } from "./expandir";
import type { PatronPauta } from "./tipos";

/** Un turno concreto de una persona, en minutos desde 1970-01-01 (hora civil). */
export type Turno = { inicio: number; fin: number; fecha: string; etiqueta: string };

export type PuestoTurnos = {
  etiqueta: string;
  patron: PatronPauta;
  inicioCiclo: string;
  /** "HH:mm"; si fin <= inicio el turno cruza la medianoche. */
  horaInicio: string;
  horaFin: string;
  /** Fechas en que la persona no está (excepciones activas). */
  ausencias?: ReadonlySet<string>;
};

/** Turnos de una serie entre dos fechas (inclusive), sin los días de ausencia. */
export function turnosDeSerie(p: PuestoTurnos, desde: string, hasta: string): Turno[] {
  const ini = minutosDeHora(p.horaInicio);
  let fin = minutosDeHora(p.horaFin);
  if (fin <= ini) fin += 1440;
  return rangoDias(desde, hasta)
    .filter((f) => trabajaEn(p.patron, p.inicioCiclo, f) && !p.ausencias?.has(f))
    .map((fecha) => ({
      fecha,
      etiqueta: p.etiqueta,
      inicio: diaNumero(fecha) * 1440 + ini,
      fin: diaNumero(fecha) * 1440 + fin,
    }));
}

export type Doblaje = { fecha: string; con: string };

/**
 * Prohibido doblar (A9): una persona no puede tener dos turnos que se solapen ni uno que empiece
 * justo cuando termina el otro (24 h seguidas). Devuelve el primer cruce o null.
 */
export function detectarDoblaje(propios: readonly Turno[], ajenos: readonly Turno[]): Doblaje | null {
  for (const a of propios) {
    for (const b of ajenos) {
      if (a.inicio <= b.fin && b.inicio <= a.fin) return { fecha: a.fecha, con: b.etiqueta };
    }
  }
  return null;
}
