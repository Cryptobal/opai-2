export type EstadoCierre = "completada" | "incompleta";

/**
 * Estado con el que se cierra una ronda (R25, rondas.md §6): «completada» si marcó todos los puntos obligatorios o
 * si los faltantes no pasan del umbral de la plantilla; «incompleta» si pasan. Solo cuentan los obligatorios (un
 * punto opcional sin marcar no castiga, R19). Con cero obligatorios la ronda siempre se completa.
 */
export function estadoDeCierre(p: {
  obligatorios: number;
  marcados: number;
  umbralIncompletaPct: number;
}): EstadoCierre {
  if (p.obligatorios <= 0) return "completada";
  const marcados = Math.min(Math.max(p.marcados, 0), p.obligatorios);
  const faltantesPct = ((p.obligatorios - marcados) / p.obligatorios) * 100;
  return faltantesPct <= p.umbralIncompletaPct ? "completada" : "incompleta";
}
