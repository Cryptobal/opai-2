/** Domingo (fin) de la semana del flujo cuyo lunes es `lunesIso`. */
export function finSemanaIso(lunesIso: string): string {
  const d = new Date(`${lunesIso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().slice(0, 10);
}

export type MovimientoSaldoCuenta = {
  cuentaId: string;
  fecha: string;
  id: string;
  saldoDespues: number | null;
};

/** Suma el saldo posterior del último movimiento por cuenta activa hasta `finSemana`. */
export function calcularSaldoSugeridoSemana(
  cuentaIds: string[],
  movimientos: MovimientoSaldoCuenta[],
  finSemana: string,
): { saldo: number | null; fechaCorte: string | null } {
  let sum = 0;
  let alguno = false;
  let fechaCorte: string | null = null;

  for (const cuentaId of cuentaIds) {
    const ultimo = movimientos
      .filter((m) => m.cuentaId === cuentaId && m.fecha <= finSemana)
      .sort((a, b) => {
        if (a.fecha !== b.fecha) return a.fecha > b.fecha ? -1 : 1;
        return a.id > b.id ? -1 : a.id < b.id ? 1 : 0;
      })[0];
    if (!ultimo || ultimo.saldoDespues == null) continue;
    sum += ultimo.saldoDespues;
    alguno = true;
    if (!fechaCorte || ultimo.fecha > fechaCorte) fechaCorte = ultimo.fecha;
  }

  return { saldo: alguno ? sum : null, fechaCorte };
}
