export const ETIQUETAS = {
  lineasDuplicadas: "Líneas de código duplicado",
  archivosLargos: "Archivos de más de 150 líneas",
  funcionesLargas: "Funciones de más de 60 líneas",
  exportacionesSinUso: "Exportaciones sin uso",
  archivosSinUso: "Archivos sin uso",
  dependenciasSinUso: "Dependencias sin uso",
} as const;

export type Metrica = keyof typeof ETIQUETAS;
export type Cifras = Record<Metrica, number>;
export type Detalle = Record<Metrica, string[]>;
