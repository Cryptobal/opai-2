import { distanciaMetros } from "./distancia";
import { estadoGeocerca } from "./geocerca";
import type { Coordenada, EstadoGeocerca, ModoPunto } from "./tipos";

/** Distancia desde la cual un QR leído con posición válida se considera lejos de su punto (R8). */
export const UMBRAL_QR_LEJOS_M = 100;

export type AnomaliaMarca = "fuera_de_geocerca" | "qr_lejos_de_su_punto" | "etiqueta_reemplazada";

export type EntradaMarca = {
  modo: ModoPunto;
  estricto: boolean;
  /** Centro del punto; `null` si el punto no tiene coordenadas. */
  centro: Coordenada | null;
  radioM: number;
  precisionMinM: number;
  /** Lectura GPS del dispositivo; `null` si no hubo (el GPS suma, nunca bloquea: R2, ADR-023). */
  lectura: (Coordenada & { precisionM: number }) | null;
  /** La etiqueta leída ya no es la vigente del punto (R7). */
  etiquetaReemplazada: boolean;
  umbralLejosM?: number;
};

export type ResultadoMarca = {
  geocerca: EstadoGeocerca | "sin_gps";
  distanciaM: number | null;
  anomalias: AnomaliaMarca[];
};

/**
 * Evalúa una marca de ronda (R2, R3, R7, R8). La marca siempre es un hecho válido: aquí solo se clasifica la
 * lectura y se listan las anomalías. Una marca nunca se infiere como presencia laboral.
 */
export function evaluarMarcaPunto(e: EntradaMarca): ResultadoMarca {
  const anomalias: AnomaliaMarca[] = [];
  if (e.etiquetaReemplazada) anomalias.push("etiqueta_reemplazada");
  if (!e.centro || !e.lectura) return { geocerca: "sin_gps", distanciaM: null, anomalias };
  const distanciaM = Math.round(distanciaMetros(e.centro, e.lectura) * 10) / 10;
  const geocerca = estadoGeocerca({
    centro: e.centro,
    lectura: e.lectura,
    radioM: e.radioM,
    precisionLecturaM: e.lectura.precisionM,
    precisionMinM: e.precisionMinM,
  });
  const usaQr = e.modo !== "gps";
  if (e.estricto && geocerca === "fuera") anomalias.push("fuera_de_geocerca");
  if (usaQr && distanciaM > (e.umbralLejosM ?? UMBRAL_QR_LEJOS_M))
    anomalias.push("qr_lejos_de_su_punto");
  return { geocerca, distanciaM, anomalias };
}
