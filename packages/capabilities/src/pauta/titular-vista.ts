import { rangoDias, sumarDias, trabajaEn } from "@opai/domain";

const DIAS_VISTA_PREVIA = 14;

type PatronDb = { clase: string; diasTrabajo: number; diasDescanso: number; diasSemana: readonly number[] };

/** Primeros 14 días de una serie nueva desde «Rige desde»: true = turno de trabajo. */
export function primerosDias(patron: PatronDb, inicioCiclo: string, desde: string) {
  const p = {
    clase: patron.clase === "semanal" ? ("semanal" as const) : ("ciclico" as const),
    diasTrabajo: patron.diasTrabajo,
    diasDescanso: patron.diasDescanso,
    diasSemana: patron.diasSemana,
  };
  return rangoDias(desde, sumarDias(desde, DIAS_VISTA_PREVIA - 1)).map((fecha) => ({
    fecha,
    trabaja: trabajaEn(p, inicioCiclo, fecha),
  }));
}
