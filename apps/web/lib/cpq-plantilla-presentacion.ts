/** Etiquetas visibles de bases de plantilla PDF del CPQ (clave interna → nombre Carlos). */
export function etiquetaBasePlantillaCpq(base: string) {
  const map: Record<string, string> = {
    clasica: "Clásica",
    ejecutiva: "Moderna",
    compacta: "Compacta",
  };
  return map[base] ?? base;
}

export const BASES_PLANTILLA_CPQ = ["clasica", "ejecutiva", "compacta"] as const;
