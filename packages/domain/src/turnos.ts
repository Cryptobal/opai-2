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

// ── Catálogo de patrones de turno (ADR-036, Brief 11 PR 1) ──────────────────
// Un patrón es la forma del ciclo (4×4, 5×2…), no el horario: el horario y las
// horas van en el puesto. "ciclico" se repite cada N días; "semanal" trabaja
// los mismos días de la semana (1 = lunes … 7 = domingo).

export const CLASES_PATRON = ["ciclico", "semanal"] as const;
export type ClasePatron = (typeof CLASES_PATRON)[number];

export type DefinicionPatron = {
  nombre: string;
  clase: ClasePatron;
  diasTrabajo: number;
  diasDescanso: number;
  /** Días de la semana (1–7) de los patrones semanales; vacío en los cíclicos. */
  diasSemana: readonly number[];
};

/** Los 6 patrones de fábrica que se siembran por tenant (no se borran; se desactivan). */
export const PATRONES_FABRICA: readonly DefinicionPatron[] = [
  { nombre: "4×4", clase: "ciclico", diasTrabajo: 4, diasDescanso: 4, diasSemana: [] },
  { nombre: "7×7", clase: "ciclico", diasTrabajo: 7, diasDescanso: 7, diasSemana: [] },
  { nombre: "14×14", clase: "ciclico", diasTrabajo: 14, diasDescanso: 14, diasSemana: [] },
  { nombre: "5×2", clase: "semanal", diasTrabajo: 5, diasDescanso: 2, diasSemana: [1, 2, 3, 4, 5] },
  { nombre: "2×5", clase: "semanal", diasTrabajo: 2, diasDescanso: 5, diasSemana: [6, 7] },
  { nombre: "3×4", clase: "ciclico", diasTrabajo: 3, diasDescanso: 4, diasSemana: [] },
];

const DIAS_CORTOS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"] as const;

export function diaValido(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= 7;
}

/** "lun–vie", "sáb y dom" o "lun, mié, vie" según los días marcados. */
export function etiquetaDiasSemana(dias: readonly number[]): string {
  const orden = [...new Set(dias)].filter(diaValido).sort((a, b) => a - b);
  if (orden.length === 0) return "";
  const nombres = orden.map((d) => DIAS_CORTOS[d - 1] ?? "");
  const consecutivos = orden.every((d, i) => i === 0 || d === (orden[i - 1] ?? d) + 1);
  if (consecutivos && orden.length > 2) return `${nombres[0]}–${nombres.at(-1)}`;
  if (nombres.length === 2) return `${nombres[0]} y ${nombres[1]}`;
  return nombres.join(", ");
}

/** Resumen legible del patrón para la lista y la ficha (CAR-8: se ve claro). */
export function resumenPatron(p: DefinicionPatron): string {
  if (p.clase === "semanal") return `Semanal · ${etiquetaDiasSemana(p.diasSemana)}`;
  const ciclo = p.diasTrabajo + p.diasDescanso;
  return `Ciclo de ${ciclo} · ${p.diasTrabajo} de trabajo, ${p.diasDescanso} de descanso`;
}

/** Días trabajados por semana: proporción del ciclo en los cíclicos, conteo en los semanales. */
export function diasPorSemana(p: DefinicionPatron): number {
  if (p.clase === "semanal") return [...new Set(p.diasSemana)].filter(diaValido).length;
  const ciclo = p.diasTrabajo + p.diasDescanso;
  return ciclo > 0 ? (7 * p.diasTrabajo) / ciclo : 0;
}

export type TramoHorario = { horaInicio: string; horaFin: string };

export type CalculoHoras = {
  patron: DefinicionPatron;
  tramos: readonly TramoHorario[];
  /** Minutos de colación; 0 si no hay. */
  colacionMin: number;
  /** true si la colación va fuera de la jornada (no se descuenta del tiempo trabajado). */
  colacionFuera: boolean;
};

/**
 * Horas semanales sugeridas (editables en el puesto). La colación "dentro de la
 * jornada" se descuenta del tramo; "fuera" no. En la rotación día/noche se
 * promedian los tramos. Ejemplo: 4×4, 08:00–20:00, 60 min dentro → 38,5 h.
 */
export function horasSemanalesSugeridas(c: CalculoHoras): number {
  const descuento = c.colacionFuera ? 0 : Math.max(0, c.colacionMin);
  const tramos = c.tramos.filter((t) => horaValida(t.horaInicio) && horaValida(t.horaFin));
  if (tramos.length === 0) return 0;
  const trabajadoMin =
    tramos.reduce((suma, t) => {
      const neto = intervaloTurno(t.horaInicio, t.horaFin).duracionMin - descuento;
      return suma + Math.max(0, neto);
    }, 0) / tramos.length;
  const horas = (diasPorSemana(c.patron) * trabajadoMin) / 60;
  return Math.round(horas * 10) / 10;
}

export function colacionValida(min: number): boolean {
  return Number.isInteger(min) && min >= 0 && min <= 240;
}
