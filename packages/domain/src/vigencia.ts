// Vigencia de documentos y escalera de avisos. Fechas de calendario como "aaaa-mm-dd" (zona del
// tenant ya aplicada por quien llama): la lógica no depende del reloj ni de la zona.

export type EstadoVigencia = "vigente" | "por_vencer" | "vencido" | "sin_fecha";

const DIA_MS = 86_400_000;

function aUtc(fecha: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!m) throw new RangeError(`Fecha inválida (aaaa-mm-dd): ${fecha}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Días desde `hoy` hasta `vence` (negativo si ya venció). */
export function diasHasta(vence: string, hoy: string): number {
  return Math.round((aUtc(vence) - aUtc(hoy)) / DIA_MS);
}

export function estadoVigencia(
  vence: string | null,
  hoy: string,
  diasAlerta: number,
): EstadoVigencia {
  if (!vence) return "sin_fecha";
  const d = diasHasta(vence, hoy);
  if (d < 0) return "vencido";
  return d <= diasAlerta ? "por_vencer" : "vigente";
}

/** Hito para "vencido" en la escalera de avisos. */
export const HITO_VENCIDO = -1;

/**
 * Hito de aviso que corresponde hoy, o null si no hay que avisar. Avisa una sola vez por hito y
 * nunca repite uno igual o mayor al último notificado (la escalera solo baja).
 */
export function hitoAlcanzado(
  vence: string | null,
  hoy: string,
  hitos: readonly number[],
  ultimoNotificado: number | null,
): number | null {
  if (!vence) return null;
  const d = diasHasta(vence, hoy);
  const actual = d < 0 ? HITO_VENCIDO : [...hitos].filter((h) => d <= h).sort((a, b) => a - b)[0];
  if (actual === undefined) return null;
  if (ultimoNotificado !== null && actual >= ultimoNotificado) return null;
  return actual;
}
