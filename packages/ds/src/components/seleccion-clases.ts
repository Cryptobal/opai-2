// Clases compartidas por Checkbox y RadioGroup, en un archivo sin Radix para que cada control
// cargue solo su primitiva (ADR-037).

// El control mide 44×44 (área tocable); el cuadro visible sigue de 20 px. Los márgenes negativos
// devuelven al diseño su ancho de 20 px, así que no cambia la composición de la fila.
export const area = "group ds-area-44 disabled:opacity-45";
export const fila = "flex min-h-11 items-start gap-3 py-2.5";
