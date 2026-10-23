// Turnos como intervalos [inicio, fin) en minutos desde la medianoche del día de inicio.
// Si la hora de fin es menor o igual a la de inicio, el turno cruza la medianoche.

const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function horaValida(hora: string): boolean {
  return HORA.test(hora);
}

export function minutosDe(hora: string): number {
  const m = HORA.exec(hora);
  if (!m) throw new RangeError(`Hora inválida (HH:mm): ${hora}`);
  return Number(m[1]) * 60 + Number(m[2]);
}

export type IntervaloTurno = {
  inicioMin: number;
  /** Fin en minutos desde la medianoche del día de inicio (> 1440 si cruza). */
  finMin: number;
  duracionMin: number;
  cruzaMedianoche: boolean;
};

export function intervaloTurno(horaInicio: string, horaFin: string): IntervaloTurno {
  const inicioMin = minutosDe(horaInicio);
  let finMin = minutosDe(horaFin);
  const cruzaMedianoche = finMin <= inicioMin;
  if (cruzaMedianoche) finMin += 24 * 60;
  return { inicioMin, finMin, duracionMin: finMin - inicioMin, cruzaMedianoche };
}

/** Patrón de turno (por ejemplo 4×4, 5×2): entre 1 y 28 días de trabajo y de descanso. */
export function patronValido(diasTrabajo: number, diasDescanso: number): boolean {
  const ok = (n: number) => Number.isInteger(n) && n >= 1 && n <= 28;
  return ok(diasTrabajo) && ok(diasDescanso);
}

/** "08:00–20:00" o "20:00–08:00 (+1)". */
export function etiquetaHorario(horaInicio: string, horaFin: string): string {
  const { cruzaMedianoche } = intervaloTurno(horaInicio, horaFin);
  return `${horaInicio}–${horaFin}${cruzaMedianoche ? " (+1)" : ""}`;
}
