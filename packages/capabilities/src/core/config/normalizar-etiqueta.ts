/** Normaliza una etiqueta de ajuste para detectar equivalentes (sin acentos ni puntuación). */
export function normalizarEtiqueta(etiqueta: string): string {
  return etiqueta
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}