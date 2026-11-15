// Scorecard por cargo (CAR-306, ADR-094): qué indicadores se usan, con qué meta y qué peso. Reglas
// puras: validación para guardar y publicar, versión vigente por mes y puntaje de 0 a 120.

import { esPeriodoMensual } from "../indicadores-gestion";

export const MAX_INDICADORES = 12;
/** Los pesos de un scorecard publicado suman exactamente esto. */
export const PESO_TOTAL = 100;
/** Puntaje máximo: cumplir todas las metas da 100; sobrecumplir llega hasta aquí (tope de logro 1,2). */
export const PUNTAJE_MAXIMO = 120;

export type ItemScorecard = { indicador: string; meta: number; peso: number };

/** Problemas que impiden guardar el scorecard, en lenguaje de negocio. Vacío = se puede guardar. */
export function erroresDeScorecard(items: readonly ItemScorecard[]): string[] {
  const errores: string[] = [];
  if (items.length > MAX_INDICADORES) {
    errores.push(`Un scorecard admite hasta ${MAX_INDICADORES} indicadores.`);
  }
  const vistos = new Set<string>();
  for (const item of items) {
    if (vistos.has(item.indicador)) errores.push(`El indicador "${item.indicador}" está repetido.`);
    vistos.add(item.indicador);
    if (!Number.isFinite(item.meta) || item.meta <= 0) {
      errores.push(`La meta de "${item.indicador}" debe ser mayor que cero.`);
    }
    if (!Number.isInteger(item.peso) || item.peso < 1 || item.peso > PESO_TOTAL) {
      errores.push(`El peso de "${item.indicador}" debe ser un entero entre 1 y ${PESO_TOTAL}.`);
    }
  }
  return errores;
}

/** Además de lo anterior, para publicar hace falta al menos un indicador y que los pesos sumen 100. */
export function erroresParaPublicar(items: readonly ItemScorecard[]): string[] {
  const errores = erroresDeScorecard(items);
  if (items.length === 0) errores.push("Agrega al menos un indicador antes de publicar.");
  const suma = items.reduce((total, item) => total + item.peso, 0);
  if (items.length > 0 && suma !== PESO_TOTAL) {
    errores.push(`Los pesos suman ${suma} %: deben sumar ${PESO_TOTAL} % para publicar.`);
  }
  return errores;
}

/**
 * Mes desde el que rige un cambio. La primera versión de un cargo rige desde el mes en curso (no hay
 * nada medido antes). Si ya hay una publicada vigente, el cambio rige desde el mes siguiente: un mes
 * que ya se está midiendo no cambia de reglas a mitad de camino.
 */
export function vigenciaDelCambio(
  publicadas: readonly string[],
  mesActual: string,
  mesSiguiente: string,
): string {
  return publicadas.some((v) => v <= mesActual) ? mesSiguiente : mesActual;
}

/** Versión publicada que rige en `periodo`: la más reciente con vigencia hasta ese mes. */
export function versionVigente<T extends { vigenteDesde: string; estado: string }>(
  versiones: readonly T[],
  periodo: string,
): T | null {
  if (!esPeriodoMensual(periodo)) return null;
  return (
    versiones
      .filter((v) => v.estado === "publicado" && v.vigenteDesde <= periodo)
      .sort((a, b) => (a.vigenteDesde < b.vigenteDesde ? 1 : -1))[0] ?? null
  );
}

export type Puntaje = {
  /** 0 a 120; 100 = todas las metas cumplidas. null = ningún indicador tuvo hechos que medir. */
  puntaje: number | null;
  /** Suma de los pesos de los indicadores que sí tuvieron hechos (0 a 100). */
  cobertura: number;
};

/**
 * Puntaje ponderado. Un indicador sin hechos (logro null) no cuenta como cero: se deja fuera y el
 * puntaje se calcula sobre los pesos que sí tienen dato; `cobertura` dice cuánto del scorecard hay.
 */
export function puntajeDe(items: readonly { peso: number; logro: number | null }[]): Puntaje {
  let cobertura = 0;
  let ponderado = 0;
  for (const item of items) {
    if (item.logro === null) continue;
    cobertura += item.peso;
    ponderado += item.peso * item.logro;
  }
  if (cobertura === 0) return { puntaje: null, cobertura: 0 };
  const puntaje = Math.round((ponderado / cobertura) * 1000) / 10;
  return { puntaje: Math.min(PUNTAJE_MAXIMO, Math.max(0, puntaje)), cobertura };
}
