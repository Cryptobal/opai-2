// Presupuesto mensual de un agente (ADR-032): avisos al 80 % y corte al 100 %, una vez por umbral.

export type Umbral = 80 | 100;

/** Porcentaje entero usado (0 si no hay presupuesto). */
export function porcentajeUsado(usadoMicro: number, presupuestoMicro: number | null): number {
  if (!presupuestoMicro || presupuestoMicro <= 0) return 0;
  return Math.floor((usadoMicro * 100) / presupuestoMicro);
}

/** Umbral que se cruza al pasar de `antes` a `despues`, o null. Sin presupuesto, nunca. */
export function umbralCruzado(
  antesMicro: number,
  despuesMicro: number,
  presupuestoMicro: number | null,
): Umbral | null {
  const a = porcentajeUsado(antesMicro, presupuestoMicro);
  const d = porcentajeUsado(despuesMicro, presupuestoMicro);
  if (a < 100 && d >= 100) return 100;
  if (a < 80 && d >= 80) return 80;
  return null;
}

/** Si el presupuesto ya está agotado (corte al 100 %). */
export function presupuestoAgotado(usadoMicro: number, presupuestoMicro: number | null): boolean {
  return porcentajeUsado(usadoMicro, presupuestoMicro) >= 100;
}

/** USD con 2 decimales a micro-USD (entero). */
export const usdAMicro = (usd: number): number => Math.round(usd * 1_000_000);
export const microAUsd = (micro: number): number => Math.round(micro / 10_000) / 100;
