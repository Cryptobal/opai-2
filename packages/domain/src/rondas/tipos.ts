// Tipos del dominio de Rondas (Brief 14 · PR 1). Lógica pura: sin Next, React ni base de datos.

/** Coordenada geográfica en grados decimales. */
export type Coordenada = { lat: number; lng: number };

export const MODOS_PUNTO = ["qr", "gps", "qr_gps"] as const;
export type ModoPunto = (typeof MODOS_PUNTO)[number];

export const ESTADOS_GEOCERCA = ["dentro", "dudosa", "fuera"] as const;
export type EstadoGeocerca = (typeof ESTADOS_GEOCERCA)[number];

export const ORDENES_PLANTILLA = ["sugerido", "estricto", "aleatorio"] as const;
export type OrdenPlantilla = (typeof ORDENES_PLANTILLA)[number];

export const GRAVEDADES = ["baja", "media", "alta"] as const;
export type Gravedad = (typeof GRAVEDADES)[number];

/** Señales del modelo de confianza con los pesos de 1.0 (R20). */
export const CLAVES_SENAL = [
  "geocerca",
  "velocidad",
  "movimiento",
  "foto",
  "mismo_dispositivo",
  "bateria",
] as const;
export type ClaveSenal = (typeof CLAVES_SENAL)[number];

/** Una señal cumple, no cumple o no está disponible en el dispositivo (R17). */
export const ESTADOS_SENAL = ["cumple", "incumple", "no_disponible"] as const;
export type EstadoSenal = (typeof ESTADOS_SENAL)[number];

export type Pesos = Record<ClaveSenal, number>;

export type ModeloConfianza = {
  /** Identificador de la versión guardado en cada marca (R20). */
  version: string;
  /** Nombre visible: «Modelo de confianza v1» (decisión de Carlos sobre el mockup, 12). */
  nombre: string;
  pesos: Pesos;
};

export const BANDAS = ["verde", "amarillo", "rojo"] as const;
export type BandaConfianza = (typeof BANDAS)[number];

/** Aporte de una señal al puntaje, con su peso declarado y su peso efectivo tras repartir (R17). */
export type AporteSenal = {
  clave: ClaveSenal;
  peso: number;
  pesoEfectivo: number;
  estado: EstadoSenal;
  aporte: number;
};

/** Desglose explicable de un puntaje 0–100 (R19). */
export type DesgloseConfianza = {
  version: string;
  puntaje: number;
  banda: BandaConfianza;
  aportes: AporteSenal[];
};
