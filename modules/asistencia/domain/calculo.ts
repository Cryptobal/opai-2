// Atraso, sobretiempo y horas trabajadas al segundo, sin redondeo (art. 44 de la Res. 38, L-45).
// Una sola colación por jornada (a diferencia de 1.0, que usaba 60 y 30 según el cálculo).

const seg = (a: Date, b: Date): number => Math.floor((b.getTime() - a.getTime()) / 1000);

/** Segundos de atraso: lo que pasó entre el inicio del turno y la entrada. 0 si llegó a tiempo. */
export function atrasoSegundos(turnoInicio: Date, entrada: Date): number {
  return Math.max(0, seg(turnoInicio, entrada));
}

/** Segundos de sobretiempo: lo que pasó entre el fin del turno y la salida. 0 si salió antes. */
export function sobretiempoSegundos(turnoFin: Date, salida: Date): number {
  return Math.max(0, seg(turnoFin, salida));
}

/** Segundos que salió antes del fin del turno. */
export function salidaAnticipadaSegundos(turnoFin: Date, salida: Date): number {
  return Math.max(0, seg(salida, turnoFin));
}

export type FuentesColacion = {
  /** Colación pactada en el vínculo laboral, en minutos; nulo si no tiene. */
  jornadaPactadaMin: number | null;
  /** Colación del puesto, en minutos; nulo si no tiene. */
  puestoMin: number | null;
};

/** La colación de la jornada pactada manda; si no hay, la del puesto; si tampoco, 0. Un solo valor. */
export function colacionMinutos(f: FuentesColacion): number {
  return f.jornadaPactadaMin ?? f.puestoMin ?? 0;
}

/** Segundos trabajados entre una entrada y una salida, menos la colación dentro de la jornada. */
export function trabajadosSegundos(entrada: Date, salida: Date, colacionMin: number): number {
  return Math.max(0, seg(entrada, salida) - Math.max(0, colacionMin) * 60);
}

export type TurnoCandidato = { id: string; inicio: Date; fin: Date };

/**
 * El turno esperado al que corresponde una marca: el que contiene el instante; si ninguno, el más
 * cercano (su inicio para una entrada, su fin para lo demás). Nulo si no hay candidatos.
 */
export function elegirTurno<T extends TurnoCandidato>(
  candidatos: readonly T[],
  ahora: Date,
  tipo: "entrada" | "salida" | "inicio_colacion" | "fin_colacion",
): T | null {
  const t = ahora.getTime();
  const dentro = candidatos.filter((c) => c.inicio.getTime() <= t && t < c.fin.getTime());
  if (dentro.length) return dentro.sort((a, b) => b.inicio.getTime() - a.inicio.getTime())[0] ?? null;
  const ref = (c: T) => Math.abs((tipo === "entrada" ? c.inicio : c.fin).getTime() - t);
  return [...candidatos].sort((a, b) => ref(a) - ref(b))[0] ?? null;
}
