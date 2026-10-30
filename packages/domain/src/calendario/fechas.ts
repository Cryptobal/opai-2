// Fechas civiles del calendario hábil (CAR-79). Todo en UTC a medianoche: el día civil "aaaa-mm-dd"
// no depende de la zona del tenant (los feriados son por fecha, no por instante). Lógica pura.

const FORMATO = /^\d{4}-\d{2}-\d{2}$/;

/** "aaaa-mm-dd" como Date UTC a medianoche; lanza si el formato o la fecha no existen. */
export function diaUtc(fecha: string): Date {
  if (!FORMATO.test(fecha)) throw new RangeError(`Fecha inválida (aaaa-mm-dd): ${fecha}`);
  const t = Date.parse(`${fecha}T00:00:00.000Z`);
  if (Number.isNaN(t)) throw new RangeError(`Fecha inexistente: ${fecha}`);
  const d = new Date(t);
  // Rechaza fechas que Date "normaliza" (p. ej. 2026-02-30 → 2026-03-02).
  if (iso(d) !== fecha) throw new RangeError(`Fecha inexistente: ${fecha}`);
  return d;
}

/** Date → "aaaa-mm-dd" (UTC). */
export function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** 0 = domingo … 6 = sábado (UTC). */
export function diaSemana(fecha: string): number {
  return diaUtc(fecha).getUTCDay();
}

/** Sábado o domingo. */
export function esFinDeSemana(fecha: string): boolean {
  const d = diaSemana(fecha);
  return d === 0 || d === 6;
}

/** Suma (o resta, si `dias` es negativo) días corridos y devuelve "aaaa-mm-dd". */
export function sumarDias(fecha: string, dias: number): string {
  const d = diaUtc(fecha);
  d.setUTCDate(d.getUTCDate() + dias);
  return iso(d);
}

export function anioDe(fecha: string): number {
  return Number(fecha.slice(0, 4));
}

export function mesDe(fecha: string): number {
  return Number(fecha.slice(5, 7));
}
