// Cuadratura del saldo de una cuenta contra su cartola (CAR-343). Puro: sin base de datos.
// El ancla es un saldo conocido al cierre de un día (saldo de apertura, saldo que informó el banco o saldo posterior
// de un movimiento): ya incluye todo lo movido hasta ese día, inclusive. Fechas «aaaa-mm-dd», montos CLP enteros
// con signo (abono positivo, cargo negativo).

export type AnclaSaldo = { saldo: number; fecha: string };
export type MovimientoSaldo = { fecha: string; monto: number };

/**
 * Saldo al cierre del día `corte`. Hacia adelante suma lo posterior al ancla hasta el corte; hacia atrás deshace lo
 * movido después del corte y hasta el ancla. Cada movimiento cuenta, también dos del mismo día y monto.
 */
export function saldoAlCierre(ancla: AnclaSaldo, movimientos: readonly MovimientoSaldo[], corte: string): number {
  let saldo = ancla.saldo;
  for (const m of movimientos) {
    if (corte >= ancla.fecha) {
      if (m.fecha > ancla.fecha && m.fecha <= corte) saldo += m.monto;
    } else if (m.fecha > corte && m.fecha <= ancla.fecha) saldo -= m.monto;
  }
  return saldo;
}

export type MesCuadrado = {
  /** «aaaa-mm». */
  mes: string;
  saldoInicial: number;
  abonos: number;
  /** Suma de los cargos, en positivo. */
  cargos: number;
  saldoFinal: number;
  movimientos: number;
};

const esMes = (mes: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(mes);

export function mesSiguiente(mes: string): string {
  const [a, m] = mes.split("-").map(Number) as [number, number];
  return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, "0")}`;
}

/** Último día del mes anterior a `mes`: el corte del saldo inicial. */
export function cierreMesAnterior(mes: string): string {
  return new Date(Date.parse(`${mes}-01T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
}

/**
 * Un renglón por mes entre `desde` y `hasta` (inclusive), para comparar con la cartola del banco: saldo inicial,
 * abonos, cargos, saldo final y cantidad de movimientos. Siempre inicial + abonos − cargos = final.
 */
export function cuadraturaMensual(
  ancla: AnclaSaldo,
  movimientos: readonly MovimientoSaldo[],
  desde: string,
  hasta: string,
): MesCuadrado[] {
  if (!esMes(desde) || !esMes(hasta) || desde > hasta) return [];
  const porMes = new Map<string, { abonos: number; cargos: number; n: number }>();
  for (const m of movimientos) {
    const mes = m.fecha.slice(0, 7);
    const t = porMes.get(mes) ?? { abonos: 0, cargos: 0, n: 0 };
    if (m.monto >= 0) t.abonos += m.monto;
    else t.cargos -= m.monto;
    t.n += 1;
    porMes.set(mes, t);
  }
  const out: MesCuadrado[] = [];
  let saldo = saldoAlCierre(ancla, movimientos, cierreMesAnterior(desde));
  for (let mes = desde; mes <= hasta; mes = mesSiguiente(mes)) {
    const { abonos, cargos, n } = porMes.get(mes) ?? { abonos: 0, cargos: 0, n: 0 };
    const saldoInicial = saldo;
    saldo += abonos - cargos;
    out.push({ mes, saldoInicial, abonos, cargos, saldoFinal: saldo, movimientos: n });
  }
  return out;
}
