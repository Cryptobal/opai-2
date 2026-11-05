// Siglas oficiales del reporte de asistencia (art. 28 g de la Res. 38) y estado del día (L-42).

export const SIGLAS = {
  "A.I.": "Ausencia injustificada",
  "A.J.": "Ausencia justificada",
  AT: "Accidente del trabajo",
  "C.T.": "Cambio de turno",
  "D.E.J.": "Distribución especial de la jornada",
  "H.E.": "Horas extraordinarias",
  "J.O.": "Jornada ordinaria",
  "L.M.": "Licencia médica",
  "P.G.R.": "Permiso con goce de remuneración",
  "PREN.": "Prenatal",
  "P.S.G.R.": "Permiso sin goce de remuneración",
  POSTN: "Postnatal",
  "S.A.": "Sin asistencia",
  VAC: "Vacaciones",
} as const;
export type Sigla = keyof typeof SIGLAS;

export type EntradaEstadoDia = {
  /** El día tiene turno esperado. */
  hayTurno: boolean;
  /** Tiene una entrada (y salida) legal ese día. */
  hayEntrada: boolean;
  haySalida: boolean;
  /** Ausencia registrada en la Pauta o en RR. HH. (licencia, vacaciones, permiso…). */
  ausenciaRegistrada?: Sigla | undefined;
  /** Sobretiempo en segundos con la salida marcada. */
  sobretiempoS: number;
};

/** Sigla del día: la ausencia registrada manda; con turno y sin entrada, sin asistencia. */
export function siglaDelDia(e: EntradaEstadoDia): Sigla | null {
  if (e.ausenciaRegistrada) return e.ausenciaRegistrada;
  if (!e.hayTurno && !e.hayEntrada) return null;
  if (e.hayEntrada) return e.haySalida && e.sobretiempoS > 0 ? "H.E." : "J.O.";
  return "S.A.";
}

export type EstadoDia = "presente" | "sin_marca" | "ausente" | "sin_turno" | "incompleto";

export function estadoDelDia(e: EntradaEstadoDia, turnoTermino: boolean): EstadoDia {
  if (e.ausenciaRegistrada) return "ausente";
  if (!e.hayTurno && !e.hayEntrada) return "sin_turno";
  if (!e.hayEntrada) return turnoTermino ? "ausente" : "sin_marca";
  return e.haySalida ? "presente" : "incompleto";
}
