// Turno esperado por persona y día (ADR-048 y ADR-077): se deriva de la celda de la Pauta o de la
// jornada pactada y se guarda en `core.turnos_esperados`. Dominio puro: no toca la base.

import type { CeldaPauta } from "./pauta/tipos";
import { intervaloEsperado, horasEsperadas } from "./turnos-instantes";

export const ORIGENES_TURNO = ["pauta", "jornada_pactada", "manual"] as const;
export type OrigenTurno = (typeof ORIGENES_TURNO)[number];

export type TurnoEsperadoDerivado = {
  personaId: string;
  /** Día operativo (fecha civil en la zona del tenant en que arranca el turno). */
  fecha: string;
  inicio: Date;
  fin: Date;
  instalacionId: string;
  puestoId: string | null;
  origen: OrigenTurno;
  /** Serie o excepción de origen, "serie:<id>" o "excepcion:<puesto>:<fecha>". */
  referencia: string | null;
  /** Minutos de colación dentro de la jornada (se descuentan de las horas). */
  colacionMin: number;
  /** El día es feriado: el turno se mantiene (la Pauta marca los feriados, no cambia el patrón). */
  feriado: boolean;
};

export type PuestoParaTurnos = {
  id: string;
  instalacionId: string;
  horaInicio: string;
  horaFin: string;
  /** Colación dentro de la jornada, en minutos; 0 si va fuera o no hay. */
  colacionMin: number;
};

export type EntradaDerivarPauta = {
  celdas: readonly CeldaPauta[];
  puesto: PuestoParaTurnos;
  zona: string;
  /** Serie o excepción que originó la celda; null si no se conoce. */
  referencia?: (celda: CeldaPauta) => string | null;
  /** ¿El titular trabaja ese día según su serie? Decide si un refuerzo se suma a su turno. */
  titularTrabaja?: (fecha: string) => boolean;
};

/**
 * Turnos de un puesto a partir de las celdas de la Pauta. Cubierto = turno de quien cubre (el titular,
 * el reemplazante o el refuerzo); ausencia, licencia, vacaciones, permiso, libre y puesto sin titular
 * no generan turno. Un refuerzo se suma al turno del titular si este trabaja ese día.
 */
export function derivarTurnosDePauta(e: EntradaDerivarPauta): TurnoEsperadoDerivado[] {
  const salida = new Map<string, TurnoEsperadoDerivado>();
  const agregar = (personaId: string, celda: CeldaPauta) => {
    const { inicio, fin } = intervaloEsperado(celda.fecha, e.puesto.horaInicio, e.puesto.horaFin, e.zona);
    const clave = `${personaId}|${inicio.toISOString()}`;
    if (salida.has(clave)) return;
    salida.set(clave, {
      personaId,
      fecha: celda.fecha,
      inicio,
      fin,
      instalacionId: e.puesto.instalacionId,
      puestoId: e.puesto.id,
      origen: "pauta",
      referencia: e.referencia?.(celda) ?? null,
      colacionMin: e.puesto.colacionMin,
      feriado: celda.feriado !== null,
    });
  };
  for (const celda of e.celdas) {
    if (celda.estado !== "cubierto" || !celda.cubiertoPorId) continue;
    agregar(celda.cubiertoPorId, celda);
    if (celda.variante === "refuerzo" && celda.titularId && e.titularTrabaja?.(celda.fecha))
      agregar(celda.titularId, celda);
  }
  return [...salida.values()].sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
}

/** Horas que se espera trabajar en un turno, con su colación y el cambio de hora. */
export const horasDeTurnoEsperado = (t: Pick<TurnoEsperadoDerivado, "inicio" | "fin" | "colacionMin">): number =>
  horasEsperadas(t.inicio, t.fin, t.colacionMin);

/** Igualdad por contenido, para regenerar sin tocar lo que no cambió (idempotencia). */
export function mismoTurno(a: TurnoEsperadoDerivado, b: TurnoEsperadoDerivado): boolean {
  return (
    a.personaId === b.personaId &&
    a.inicio.getTime() === b.inicio.getTime() &&
    a.fin.getTime() === b.fin.getTime() &&
    a.instalacionId === b.instalacionId &&
    a.puestoId === b.puestoId &&
    a.colacionMin === b.colacionMin &&
    a.feriado === b.feriado &&
    a.referencia === b.referencia
  );
}
