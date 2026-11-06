// Alertas del art. 45 de la Res. 38 (L-31 a L-34). Puras: los trabajos idempotentes las evalúan con
// un reloj inyectado, así se prueban con reloj simulado; los crons solo encolan (ADR-029).

export const MINUTOS_ALERTA_INICIO_DEFECTO = 30;
export const DIAS_AVISO_COMPENSABLES = 30;

const MIN = 60_000;

export type TurnoParaAlerta = { inicio: Date; fin: Date };

/** Falta la marca de inicio: pasaron N minutos desde el inicio del turno sin entrada, y el turno sigue. */
export function debeAlertarInicio(t: TurnoParaAlerta, hayEntrada: boolean, ahora: Date, minutos: number): boolean {
  const limite = t.inicio.getTime() + minutos * MIN;
  return !hayEntrada && ahora.getTime() >= limite && ahora.getTime() < t.fin.getTime();
}

/** Falta la marca de término: el turno terminó, hubo entrada y no hay salida (el empleador puede apagarla). */
export function debeAlertarTermino(
  t: TurnoParaAlerta, hayEntrada: boolean, haySalida: boolean, ahora: Date, activa: boolean,
): boolean {
  return activa && hayEntrada && !haySalida && ahora.getTime() >= t.fin.getTime();
}

/** ¿Toca el aviso de compensables? Cada 30 días desde el último (o desde la primera marca). */
export function tocaAvisoCompensables(ultimoAviso: Date | null, primeraMarca: Date | null, ahora: Date): boolean {
  const base = ultimoAviso ?? primeraMarca;
  if (!base) return false;
  return ahora.getTime() - base.getTime() >= DIAS_AVISO_COMPENSABLES * 86_400_000;
}

/** Texto «6 h 30 min» a partir de segundos. */
export function textoDuracion(segundos: number): string {
  const total = Math.max(0, Math.floor(segundos / 60));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}
