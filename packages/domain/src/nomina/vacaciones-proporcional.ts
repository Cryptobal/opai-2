/** Días de vacaciones acumulados (estimación Chile: 15 días hábiles por año de servicio, proporcional). */
export function diasVacacionesAcumulados(mesesServicio: number): number {
  if (mesesServicio <= 0) return 0;
  return Math.round(((15 / 12) * mesesServicio) * 100) / 100;
}