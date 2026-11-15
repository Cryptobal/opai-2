// Resumen del flujo de caja (CAR-378): agrupación por mes, indicadores de caja y escenario de cobros atrasados.
// Puro: recibe la serie semanal ya calculada (la misma de la planilla) y no consulta nada.
import { sumarSemanas, tonoDeSaldo, type SemanaCalculada, type Tono } from "./index";

const DIA_MS = 86_400_000;
/** Mes «aaaa-mm» al que pertenece una semana: el de su jueves (regla ISO). Decisión nocturna CAR-378 (revisar). */
export const mesDeSemana = (lunes: string) => new Date(Date.parse(`${lunes}T00:00:00Z`) + 3 * DIA_MS).toISOString().slice(0, 7);

/** Recalcula los saldos desde el saldo inicial de la primera semana, con el tono contra el umbral. */
function encadenar(semanas: readonly SemanaCalculada[], umbral: number): SemanaCalculada[] {
  let saldo = semanas[0]?.saldoInicial ?? 0;
  return semanas.map((s) => {
    const saldoInicial = saldo;
    saldo += s.ingresos - s.egresos;
    return { ...s, saldoInicial, neto: s.ingresos - s.egresos, saldoFinal: saldo, tono: tonoDeSaldo(saldo, umbral) };
  });
}

/**
 * Escenario «cobros atrasados»: los cobros proyectados (por semana) se corren `n` semanas. Solo desde la semana en
 * curso: el pasado es cartola. Lo que cae fuera del horizonte deja de contar dentro de él (no se pierde: llega después).
 */
export function atrasarCobros(
  semanas: readonly SemanaCalculada[],
  cobros: ReadonlyMap<string, number>,
  n: number,
  lunesActual: string,
  umbral: number,
): SemanaCalculada[] {
  if (n <= 0) return [...semanas];
  const ajustadas = semanas.map((s) => {
    if (s.semana < lunesActual) return s;
    const sale = cobros.get(s.semana) ?? 0;
    const origen = sumarSemanas(s.semana, -n);
    const entra = origen >= lunesActual ? (cobros.get(origen) ?? 0) : 0;
    return { ...s, ingresos: s.ingresos - sale + entra };
  });
  return encadenar(ajustadas, umbral);
}

export type Periodo = {
  clave: string;
  desde: string;
  hasta: string;
  semanas: number;
  ingresos: number;
  egresos: number;
  neto: number;
  saldoInicial: number;
  saldoFinal: number;
  /** Peor tono de sus semanas: un mes con una semana negativa es «peligro» aunque cierre bien. */
  tono: Tono;
};

const peor = (a: Tono, b: Tono): Tono => (a === "peligro" || b === "peligro" ? "peligro" : a ?? b);

/** Semanas agrupadas por mes (el de su jueves). El saldo del mes es el de su última semana. */
export function agruparPorMes(semanas: readonly SemanaCalculada[]): Periodo[] {
  const out: Periodo[] = [];
  for (const s of semanas) {
    const clave = mesDeSemana(s.semana);
    const p = out.at(-1);
    if (p && p.clave === clave) {
      Object.assign(p, { hasta: s.semana, semanas: p.semanas + 1, ingresos: p.ingresos + s.ingresos, egresos: p.egresos + s.egresos, saldoFinal: s.saldoFinal, tono: peor(p.tono, s.tono) });
      p.neto = p.ingresos - p.egresos;
    } else {
      out.push({ clave, desde: s.semana, hasta: s.semana, semanas: 1, ingresos: s.ingresos, egresos: s.egresos, neto: s.neto, saldoInicial: s.saldoInicial, saldoFinal: s.saldoFinal, tono: s.tono });
    }
  }
  return out;
}

export type Indicadores = {
  primerQuiebre: { semana: string; saldo: number; faltaParaUmbral: number } | null;
  primerNegativo: { semana: string; saldo: number } | null;
  minimo: { semana: string; saldo: number } | null;
  /** Semanas desde la actual hasta antes de la primera con saldo negativo (todo el horizonte si nunca lo es). */
  semanasDeCaja: number;
  semanasBajoUmbral: number;
  finHorizonte: { semana: string; saldo: number } | null;
};

/** Indicadores de caja desde la semana en curso (paridad con el Panel de OPAI 1). */
export function indicadores(semanas: readonly SemanaCalculada[], lunesActual: string, umbral: number): Indicadores {
  const futuras = semanas.filter((s) => s.semana >= lunesActual);
  const quiebre = futuras.find((s) => s.saldoFinal < umbral);
  const negativo = futuras.find((s) => s.saldoFinal < 0);
  const minimo = futuras.reduce<SemanaCalculada | null>((m, s) => (!m || s.saldoFinal < m.saldoFinal ? s : m), null);
  const fin = futuras.at(-1);
  return {
    primerQuiebre: quiebre ? { semana: quiebre.semana, saldo: quiebre.saldoFinal, faltaParaUmbral: umbral - quiebre.saldoFinal } : null,
    primerNegativo: negativo ? { semana: negativo.semana, saldo: negativo.saldoFinal } : null,
    minimo: minimo ? { semana: minimo.semana, saldo: minimo.saldoFinal } : null,
    semanasDeCaja: negativo ? futuras.indexOf(negativo) : futuras.length,
    semanasBajoUmbral: futuras.filter((s) => s.saldoFinal < umbral).length,
    finHorizonte: fin ? { semana: fin.semana, saldo: fin.saldoFinal } : null,
  };
}
