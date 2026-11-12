// Período de medición (ADR-094): mes civil de la empresa, como intervalo [desde, hasta) en instantes
// UTC. El mes empieza a las 00:00 de la zona del tenant, con su horario de verano.

import { instanteLocal } from "../comercial/seguimiento-agenda";
import { periodoSiguiente } from "../nomina/periodo";

/** Mes civil "aaaa-mm". */
export const PERIODO_MENSUAL = /^\d{4}-(0[1-9]|1[0-2])$/;

export type RangoPeriodo = {
  periodo: string;
  /** Primer instante del mes en la zona de la empresa (inclusive). */
  desde: Date;
  /** Primer instante del mes siguiente (exclusivo). */
  hasta: Date;
};

export const esPeriodoMensual = (periodo: string): boolean => PERIODO_MENSUAL.test(periodo);

/** Mes siguiente a "aaaa-mm" (diciembre pasa a enero del año siguiente). */
function mesSiguiente(periodo: string): string {
  const [anio, mes] = periodo.split("-").map(Number) as [number, number];
  const s = periodoSiguiente(anio, mes);
  return `${s.anio}-${String(s.mes).padStart(2, "0")}`;
}

/** Intervalo [desde, hasta) del mes en la zona de la empresa. Lanza si el período no es "aaaa-mm". */
export function rangoDelPeriodo(periodo: string, zona: string): RangoPeriodo {
  if (!esPeriodoMensual(periodo)) {
    throw new Error(`Período inválido "${periodo}": usa aaaa-mm.`);
  }
  return {
    periodo,
    desde: instanteLocal(`${periodo}-01`, "00:00", zona),
    hasta: instanteLocal(`${mesSiguiente(periodo)}-01`, "00:00", zona),
  };
}
