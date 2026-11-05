// Topes de jornada legal con vigencia (Ley 21.561, ADR-056). La fuente de verdad es el indicador
// «jornada» del motor de sueldos (por empresa, con vigencia); esta tabla es solo el respaldo cuando
// el motor aún no trae valores; los valores del indicador, cuando existen, mandan encima de ella.

export type VigenciaJornada = {
  /** Primer día de vigencia (inclusive), "aaaa-mm-dd". */
  desde: string;
  /** Último día (inclusive); ausente = sin fecha límite. */
  hasta?: string | undefined;
  /** Horas semanales de la jornada ordinaria máxima. */
  horas: number;
};

/** Ley 21.561: 45 h → 44 h (26-abr-2024) → 42 h (26-abr-2026) → 40 h (26-abr-2028). */
export const VIGENCIAS_JORNADA_SEMANAL: readonly VigenciaJornada[] = [
  { desde: "1900-01-01", hasta: "2024-04-25", horas: 45 },
  { desde: "2024-04-26", hasta: "2026-04-25", horas: 44 },
  { desde: "2026-04-26", hasta: "2028-04-25", horas: 42 },
  { desde: "2028-04-26", horas: 40 },
];

/** Horas por debajo del tope desde las que la Pauta avisa en amarillo (como 1.0: 40 h con tope 42). */
export const MARGEN_AVISO_SEMANAL_H = 2;

/** Defectos del ajuste del manifest de Pauta (ADR-021): tope mensual y descanso mínimo entre turnos. */
export const LIMITE_MENSUAL_HORAS_DEFECTO = 180;
export const DESCANSO_MINIMO_HORAS_DEFECTO = 12;

/** Tope semanal vigente en una fecha civil; la última vigencia que la cubre manda. */
export function limiteSemanalEn(
  fecha: string,
  tabla: readonly VigenciaJornada[] = VIGENCIAS_JORNADA_SEMANAL,
): number {
  let horas: number | undefined;
  for (const v of tabla) {
    if (v.desde <= fecha && (v.hasta === undefined || v.hasta >= fecha)) horas = v.horas;
  }
  if (horas === undefined) {
    const primera = [...tabla].sort((a, b) => a.desde.localeCompare(b.desde))[0];
    if (!primera) throw new RangeError("Sin vigencias de jornada legal.");
    return primera.horas;
  }
  return horas;
}

export const avisoSemanalEn = (fecha: string, tabla?: readonly VigenciaJornada[]): number =>
  limiteSemanalEn(fecha, tabla) - MARGEN_AVISO_SEMANAL_H;
