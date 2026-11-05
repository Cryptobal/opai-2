// Instantes de los turnos esperados: la hora civil del tenant ("2026-09-05" + "22:00" en
// America/Santiago) se convierte a un instante UTC respetando el cambio de hora (instanteLocal, de la
// agenda de Comercial, que se reutiliza). Los turnos son
// intervalos [inicio, fin): el fin es exclusivo (turnos.ts).

import { instanteLocal } from "./comercial/seguimiento-agenda";
import { intervaloTurno } from "./turnos";

export type IntervaloEsperado = { inicio: Date; fin: Date };

/** [inicio, fin) del turno que arranca el día civil `fecha`; el fin cae al día siguiente si cruza. */
export function intervaloEsperado(
  fecha: string,
  horaInicio: string,
  horaFin: string,
  zona: string,
): IntervaloEsperado {
  const { cruzaMedianoche } = intervaloTurno(horaInicio, horaFin);
  const inicio = instanteLocal(fecha, horaInicio, zona);
  const diaFin = cruzaMedianoche ? new Date(Date.parse(`${fecha}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10) : fecha;
  return { inicio, fin: instanteLocal(diaFin, horaFin, zona) };
}

/** Horas reales entre dos instantes (con cambio de hora, un turno nocturno dura 7 o 9 h, no 8). */
export const horasEntre = (inicio: Date, fin: Date): number => (fin.getTime() - inicio.getTime()) / 3_600_000;

/** Horas trabajadas esperadas: duración real menos la colación que va dentro de la jornada. */
export function horasEsperadas(inicio: Date, fin: Date, colacionMin: number): number {
  return Math.max(0, horasEntre(inicio, fin) - Math.max(0, colacionMin) / 60);
}
