// Presentación de la UF de un período programado (CAR-221 B). Puro: sin reloj ni base de datos.

/** Valor de la UF en pesos con dos decimales («$ 39.123,45»), a partir de centavos de CLP. */
export function ufTexto(ufCentavos: number): string {
  const pesos = Math.trunc(ufCentavos / 100);
  const cent = String(ufCentavos % 100).padStart(2, "0");
  return `$ ${pesos.toLocaleString("es-CL")},${cent}`;
}

/** Una UF de un período futuro es una estimación (la última publicada): la generación real exige la exacta. */
export const ufEsEstimada = (fechaPeriodo: string, hoy: string): boolean => fechaPeriodo > hoy;

/** Línea de conversión de un período en UF, o null si la programación es en CLP o no hay UF. */
export function conversionTexto(
  moneda: string,
  ufCentavos: number | null,
  fechaPeriodo: string,
  hoy: string,
): string | null {
  if (moneda !== "UF" || ufCentavos === null) return null;
  return `UF ${ufTexto(ufCentavos)}${ufEsEstimada(fechaPeriodo, hoy) ? " (estimada con la última publicada)" : " (publicada)"}`;
}
