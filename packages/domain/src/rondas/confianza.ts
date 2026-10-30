import {
  type AporteSenal,
  type BandaConfianza,
  CLAVES_SENAL,
  type ClaveSenal,
  type DesgloseConfianza,
  type EstadoSenal,
  type ModeloConfianza,
} from "./tipos";

/**
 * Modelo de confianza inicial con los pesos de 1.0 (R20): geocerca 30, velocidad bajo umbral 20,
 * movimiento real 15, foto 15, mismo dispositivo 10, batería > 10 % 10. Se llama «Modelo de confianza
 * v1» en pantalla (decisión de Carlos sobre el mockup, 12). Suman 100.
 */
export const MODELO_CONFIANZA_V1: ModeloConfianza = {
  version: "v1",
  nombre: "Modelo de confianza v1",
  pesos: { geocerca: 30, velocidad: 20, movimiento: 15, foto: 15, mismo_dispositivo: 10, bateria: 10 },
};

/** Bandas de 1.0 (R19): verde ≥ 80, amarillo ≥ 60, rojo < 60. */
export function bandaDe(puntaje: number): BandaConfianza {
  if (puntaje >= 80) return "verde";
  if (puntaje >= 60) return "amarillo";
  return "rojo";
}

/** Los pesos del modelo son enteros ≥ 0 y suman exactamente 100. */
export function pesosValidos(modelo: ModeloConfianza): boolean {
  const valores = CLAVES_SENAL.map((c) => modelo.pesos[c]);
  if (valores.some((p) => !Number.isInteger(p) || p < 0)) return false;
  return valores.reduce((a, b) => a + b, 0) === 100;
}

/**
 * Desglose explicable del puntaje de una marca (R19). Una señal «no disponible» no castiga: su peso se
 * reparte proporcionalmente entre las disponibles (R17). El puntaje es 0–100 entero.
 */
export function desgloseConfianza(
  modelo: ModeloConfianza,
  senales: Readonly<Record<ClaveSenal, EstadoSenal>>,
): DesgloseConfianza {
  const pesoDisponible = CLAVES_SENAL.filter((c) => senales[c] !== "no_disponible").reduce(
    (suma, c) => suma + modelo.pesos[c],
    0,
  );
  const aportes: AporteSenal[] = CLAVES_SENAL.map((clave) => {
    const peso = modelo.pesos[clave];
    const estado = senales[clave];
    if (estado === "no_disponible" || pesoDisponible === 0) {
      return { clave, peso, pesoEfectivo: 0, estado, aporte: 0 };
    }
    const pesoEfectivo = Math.round((peso / pesoDisponible) * 100);
    return { clave, peso, pesoEfectivo, estado, aporte: estado === "cumple" ? pesoEfectivo : 0 };
  });
  const cumplido = CLAVES_SENAL.filter(
    (c) => senales[c] === "cumple" && pesoDisponible > 0,
  ).reduce((suma, c) => suma + modelo.pesos[c], 0);
  const puntaje = pesoDisponible === 0 ? 0 : Math.round((cumplido / pesoDisponible) * 100);
  return { version: modelo.version, puntaje, banda: bandaDe(puntaje), aportes };
}

/**
 * Puntaje de la ronda: promedio de las marcas de sus puntos obligatorios (R19; cambio frente a 1.0,
 * que promediaba todas). Sin marcas obligatorias, 0.
 */
export function puntajeRonda(puntajesObligatorios: readonly number[]): number {
  if (puntajesObligatorios.length === 0) return 0;
  const suma = puntajesObligatorios.reduce((a, b) => a + b, 0);
  return Math.round(suma / puntajesObligatorios.length);
}
