import { cache } from "react";

import { registrarObservadorConsultas } from "@opai/db";

/**
 * Instrumentación de rendimiento por request (ADR-045, Brief 03): fases de servidor y conteo de
 * consultas a Neon. El objeto vive por request gracias a `cache()` de React; el observador de
 * `@opai/db` suma una consulta por cada operación de modelo.
 *
 * Next (App Router, respuesta en streaming) no deja fijar cabeceras de respuesta desde un Server
 * Component después de renderizar, así que el desglose por fases no puede viajar en una cabecera
 * `Server-Timing` HTTP real sin una ida y vuelta extra (que iría en contra del propio objetivo). El
 * marcador de servidor (`app/_components/marcador-metricas.tsx`) emite estas métricas en el HTML en
 * la gramática de `Server-Timing`; el gate de Playwright las lee de ahí. El PR 2 decide si además se
 * expone una cabecera real cuando el shell viva en el layout.
 */
export type FaseNavegacion = "sesion" | "identidad" | "datos";

export type MetricasNavegacion = {
  /** Consultas a Neon (operaciones de modelo Prisma) contadas en el request. */
  consultas: number;
  /** Duración de cada fase de servidor en ms (un decimal). */
  fases: Partial<Record<FaseNavegacion, number>>;
};

// Un objeto por request. Fuera de un render (cron, script) `cache()` ejecuta la función sin
// memoizar (React 19) y devuelve un objeto nuevo y descartable en cada llamada; por eso la medición
// simplemente no se acumula en ningún lado. El try/catch cubre cualquier error del contexto.
const almacen = cache((): MetricasNavegacion => ({ consultas: 0, fases: {} }));

/** Métricas del request actual. Devuelve un objeto nuevo y descartable fuera de un render. */
export function metricasActuales(): MetricasNavegacion {
  try {
    return almacen();
  } catch {
    return { consultas: 0, fases: {} };
  }
}

const unDecimal = (ms: number) => Math.round(ms * 10) / 10;

/**
 * `total` del request en ms: desde la marca de inicio del proxy (`x-opai-t0`, época) hasta ahora.
 * Vive aquí (no en el componente) porque `Date.now()` no puede llamarse durante el render. Devuelve
 * `null` —no 0— cuando falta la marca: así el marcador omite `total` y el gate distingue «no medido»
 * de «0 ms», en vez de dar por bueno un total inexistente.
 */
export function totalDesdeInicio(t0Epoca: number): number | null {
  if (!Number.isFinite(t0Epoca) || t0Epoca <= 0) return null;
  return Math.max(0, Date.now() - t0Epoca);
}

/** Mide una fase de servidor y guarda su duración. No altera el resultado ni los errores de `fn`. */
export async function medirFase<T>(fase: FaseNavegacion, fn: () => Promise<T>): Promise<T> {
  const inicio = performance.now();
  try {
    return await fn();
  } finally {
    try {
      almacen().fases[fase] = unDecimal(performance.now() - inicio);
    } catch {
      // Sin contexto de request no hay dónde guardar la medición.
    }
  }
}

// El observador vive mientras viva el módulo (el borde lo registra una sola vez al importarlo).
registrarObservadorConsultas(() => {
  almacen().consultas += 1;
});

/**
 * Valor en la gramática de `Server-Timing`, p. ej.
 * `sesion;dur=12.3, identidad;dur=4, datos;dur=180, consultas;dur=6, total;dur=210`.
 * `consultas;dur` lleva el número de consultas (no ms): es la convención del contador del brief.
 * `consultas;dur` cuenta operaciones de modelo Prisma (una «consulta» lógica), no idas y vueltas a
 * Neon: cada operación de `forTenant` son unas cuatro (BEGIN, set_config, la consulta, COMMIT).
 * Si falta la marca del proxy, `total` es `null` y se omite (no se emite `total;dur=0`).
 */
export function serverTiming(m: MetricasNavegacion, totalMs: number | null): string {
  const partes: string[] = [];
  for (const fase of ["sesion", "identidad", "datos"] as const) {
    const ms = m.fases[fase];
    if (ms !== undefined) partes.push(`${fase};dur=${ms}`);
  }
  partes.push(`consultas;dur=${m.consultas}`);
  if (totalMs !== null) partes.push(`total;dur=${unDecimal(totalMs)}`);
  return partes.join(", ");
}
