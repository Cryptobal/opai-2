// Remanente de crédito fiscal (CAR-173): el crédito que excede al débito de un mes se arrastra al siguiente F29 y se
// descuenta del IVA a pagar. Puro. No aplica el reajuste por UTM del SII (el borrador lo dice).

export type MesIva = { periodo: string; debito: number; credito: number };

/** Remanente con que se llega al mes `periodo`, arrastrando los meses anteriores en orden (los posteriores se ignoran). */
export function remanenteAnterior(meses: readonly MesIva[], periodo: string): number {
  let remanente = 0;
  for (const m of [...meses].sort((a, b) => a.periodo.localeCompare(b.periodo))) {
    if (m.periodo >= periodo) break;
    remanente = Math.max(0, m.credito + remanente - m.debito);
  }
  return remanente;
}

/** IVA del mes con el remanente anterior: lo que se paga y lo que queda a favor para el mes siguiente. */
export function ivaConRemanente(debito: number, credito: number, anterior: number) {
  const neto = debito - credito - anterior;
  return { ivaAPagar: Math.max(0, neto), remanenteSiguiente: Math.max(0, -neto) };
}
