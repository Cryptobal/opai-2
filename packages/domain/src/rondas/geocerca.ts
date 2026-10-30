import { distanciaMetros } from "./distancia";
import type { Coordenada, EstadoGeocerca } from "./tipos";

export type EntradaGeocerca = {
  centro: Coordenada;
  lectura: Coordenada;
  /** Radio de la geocerca en metros (R3). */
  radioM: number;
  /** Precisión informada por el dispositivo en la lectura, en metros. */
  precisionLecturaM: number;
  /** Precisión mínima aceptada del punto, en metros (R3). */
  precisionMinM: number;
};

/**
 * Estado de una lectura GPS respecto del punto (R3): «dentro» si la distancia al centro ≤ radio y la
 * precisión informada ≤ la mínima aceptada; «dudosa» si la distancia ≤ radio + la precisión informada
 * pero no cumple lo anterior; «fuera» en otro caso. El GPS nunca bloquea la marca (ADR-023): esto solo
 * clasifica la lectura.
 */
export function estadoGeocerca(e: EntradaGeocerca): EstadoGeocerca {
  const distancia = distanciaMetros(e.centro, e.lectura);
  if (distancia <= e.radioM && e.precisionLecturaM <= e.precisionMinM) return "dentro";
  if (distancia <= e.radioM + e.precisionLecturaM) return "dudosa";
  return "fuera";
}

/**
 * Permanencia cumplida (R5): con modo solo GPS, el punto se da por visitado cuando hay al menos dos
 * lecturas «dentro» separadas por la permanencia mínima. `instantesDentroS` son los segundos de cada
 * lectura que quedó «dentro», en cualquier orden.
 */
export function permanenciaCumplida(
  instantesDentroS: readonly number[],
  permanenciaMinS: number,
): boolean {
  if (permanenciaMinS <= 0) return instantesDentroS.length >= 1;
  if (instantesDentroS.length < 2) return false;
  const orden = [...instantesDentroS].sort((a, b) => a - b);
  const primero = orden[0] as number;
  const ultimo = orden[orden.length - 1] as number;
  return ultimo - primero >= permanenciaMinS;
}

/** Permanencia por defecto según el modo del punto: 0 con QR, 15 s con solo GPS (R5). */
export function permanenciaDefecto(modoIncluyeSoloGps: boolean): number {
  return modoIncluyeSoloGps ? 15 : 0;
}
