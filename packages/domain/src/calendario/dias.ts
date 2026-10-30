// Resolución de feriados por precedencia (CAR-79). El llamador (capacidad) ya filtró las filas
// aplicables por región e instalación; aquí se decide, por fecha, cuál manda. Lógica pura.

import { anioDe, mesDe } from "./fechas";

/** De dónde viene el feriado: nacional y regional los mantiene la plataforma; tenant lo agrega el cliente. */
export const FUENTES_DIA = ["nacional", "regional", "tenant"] as const;
export type FuenteDia = (typeof FUENTES_DIA)[number];

/** En la v1 solo se modela el feriado. H (hábil forzado) e I (inhábil) son propuesta (ADR, §Calendario). */
export const TIPOS_DIA = ["feriado"] as const;
export type TipoDia = (typeof TIPOS_DIA)[number];

/** Un feriado ya resuelto para un ámbito. */
export type FeriadoResuelto = {
  fecha: string; // aaaa-mm-dd
  nombre: string;
  irrenunciable: boolean;
  fuente: FuenteDia;
  /** null = nacional; código de región cuando es regional. */
  region: string | null;
};

/** Fila cruda que entra al resolvedor (de plataforma o del tenant). */
export type DiaCalendarioEntrada = FeriadoResuelto & {
  /** true si la fila es del tenant (tenant_id no nulo): sobrescribe a la de plataforma. */
  esTenant: boolean;
};

/** Precedencia por fecha: el tenant gana a plataforma; en plataforma, lo regional gana a lo nacional. */
function precedencia(d: DiaCalendarioEntrada): number {
  if (d.esTenant) return 2;
  return d.region ? 1 : 0;
}

/**
 * Para una misma fecha gana la fila de mayor precedencia (tenant > regional > nacional). Así un
 * feriado del tenant sobrescribe al nacional solo en ese tenant (CA2). Devuelve ordenado por fecha.
 */
export function resolverFeriados(dias: readonly DiaCalendarioEntrada[]): FeriadoResuelto[] {
  const porFecha = new Map<string, DiaCalendarioEntrada>();
  for (const d of dias) {
    const prev = porFecha.get(d.fecha);
    if (!prev || precedencia(d) > precedencia(prev)) porFecha.set(d.fecha, d);
  }
  return [...porFecha.values()]
    .map(({ esTenant: _esTenant, ...r }) => r)
    .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
}

/** Feriados de un mes (1–12) a partir de feriados ya resueltos, ordenados por fecha. */
export function feriadosDelMes(
  feriados: readonly FeriadoResuelto[],
  anio: number,
  mes: number,
): FeriadoResuelto[] {
  return feriados
    .filter((f) => anioDe(f.fecha) === anio && mesDe(f.fecha) === mes)
    .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
}

/** Conjunto de fechas de feriado para el cálculo de días hábiles. */
export function conjuntoFeriados(feriados: readonly FeriadoResuelto[]): ReadonlySet<string> {
  return new Set(feriados.map((f) => f.fecha));
}
