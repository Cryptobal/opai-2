// Tipos de jornada y sus descansos. Puro. Los valores legales con vigencia (ADR-021) se leen de ajustes;
// aquí viven las reglas fijas de cada tipo. «Por confirmar» queda marcado donde la Res. 38 no fija el número.

export const TIPOS_JORNADA = ["ordinaria", "excepcional", "parcial", "teletrabajo"] as const;
export type TipoJornada = (typeof TIPOS_JORNADA)[number];

export const ETIQUETA_JORNADA: Record<TipoJornada, string> = {
  ordinaria: "Jornada ordinaria",
  excepcional: "Jornada excepcional (D.E.J.)",
  parcial: "Jornada parcial",
  teletrabajo: "Teletrabajo",
};

export type ReglaDescanso = {
  /** Descanso mínimo entre el término de una jornada y el inicio de la siguiente, en horas; nulo si no se exige. */
  entreJornadasHoras: number | null;
  /** Se exige la colación dentro de la jornada. */
  colacion: boolean;
  /** Se avisa al trabajador y al empleador del derecho a desconexión. */
  avisoDesconexion: boolean;
};

/**
 * Teletrabajo: derecho a desconexión de al menos 12 horas continuas en 24 (Ley 21.220, art. 152 quáter J).
 * Excepcional: el descanso entre turnos largos (12×12) lo fija la resolución de excepción; no se inventa un
 * número aquí (queda en la resolución del snapshot de la marca).
 */
export const REGLAS_DESCANSO: Record<TipoJornada, ReglaDescanso> = {
  ordinaria: { entreJornadasHoras: null, colacion: true, avisoDesconexion: false },
  excepcional: { entreJornadasHoras: null, colacion: true, avisoDesconexion: false },
  parcial: { entreJornadasHoras: null, colacion: false, avisoDesconexion: false },
  teletrabajo: { entreJornadasHoras: 12, colacion: true, avisoDesconexion: true },
};

export const esTipoJornada = (v: unknown): v is TipoJornada =>
  typeof v === "string" && (TIPOS_JORNADA as readonly string[]).includes(v);

/** Horas entre la salida anterior y la entrada; nulo si no hay salida previa. */
export function horasDeDescanso(salidaPrevia: Date | null, entrada: Date): number | null {
  if (!salidaPrevia) return null;
  return Math.max(0, (entrada.getTime() - salidaPrevia.getTime()) / 3_600_000);
}

/** El descanso entre jornadas no alcanza el mínimo de la regla del tipo. */
export function descansoInsuficiente(tipo: TipoJornada, salidaPrevia: Date | null, entrada: Date): boolean {
  const min = REGLAS_DESCANSO[tipo].entreJornadasHoras;
  const h = horasDeDescanso(salidaPrevia, entrada);
  return min !== null && h !== null && h < min;
}
