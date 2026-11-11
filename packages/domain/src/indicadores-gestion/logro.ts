// Logro de una meta (ADR-094): cuánto de la meta se alcanzó. No es dinero: es una razón, por eso va
// en número con cuatro decimales y no en enteros escalados.

import type { SentidoIndicador } from "./definicion";

/** Tope del logro por indicador: superar la meta suma, pero no compensa sin límite a los demás. */
export const TOPE_LOGRO = 1.2;
/** Desde aquí el semáforo es verde (meta cumplida) y desde aquí amarillo (cerca de la meta). */
export const LOGRO_VERDE = 1;
export const LOGRO_AMARILLO = 0.85;

const redondear = (n: number): number => Math.round(n * 10_000) / 10_000;

/**
 * Logro de la meta: 1 = meta cumplida, con tope `TOPE_LOGRO`. `null` si no hay dato que medir
 * (`valor` null) o la meta no es válida: sin dato no hay logro, que no es lo mismo que logro cero.
 */
export function logroDeMeta(
  valor: number | null,
  meta: number,
  sentido: SentidoIndicador,
): number | null {
  if (valor === null || !Number.isFinite(valor) || !Number.isFinite(meta) || meta <= 0) return null;
  if (valor < 0) return 0;
  // "menor": valor 0 es el mejor resultado posible (cero turnos descubiertos), no una división.
  const razon = sentido === "mayor" ? valor / meta : valor === 0 ? TOPE_LOGRO : meta / valor;
  return redondear(Math.min(TOPE_LOGRO, Math.max(0, razon)));
}

export type SemaforoLogro = "verde" | "amarillo" | "rojo";

export function semaforoDeLogro(logro: number): SemaforoLogro {
  if (logro >= LOGRO_VERDE) return "verde";
  return logro >= LOGRO_AMARILLO ? "amarillo" : "rojo";
}
