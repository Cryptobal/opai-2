// IVA y PPM proyectados en el flujo de caja (ADR-073, regla 5): el IVA del mes M (débito − crédito) se paga en M+1
// junto con el PPM; cada mes se puede marcar la postergación del IVA a M+2. El PPM se paga siempre en M+1. Puro.

export const PPM_ESCALA_BPS = 10_000;

export type DocumentoImpuesto = {
  /** Fecha de emisión del documento (aaaa-mm-dd): fija el período del libro. */
  fecha: string;
  tipoDte: number;
  montoNeto: number;
  montoExento: number;
  montoIva: number;
};

/** Signo en el libro: la nota de crédito (61) resta; factura, ND y demás suman. */
const signo = (tipoDte: number) => (tipoDte === 61 ? -1 : 1);

export const periodoDeFecha = (fechaIso: string): string => fechaIso.slice(0, 7);

/** Suma `n` meses a un período «aaaa-mm». */
export function sumarMeses(periodo: string, n: number): string {
  const [a, m] = periodo.split("-").map(Number) as [number, number];
  const idx = a * 12 + (m - 1) + n;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`;
}

/** Día de pago dentro del mes, acotado al último día real del mes (feb 30 → 28). */
export function fechaDePago(periodo: string, dia: number): string {
  const [a, m] = periodo.split("-").map(Number) as [number, number];
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return `${periodo}-${String(Math.min(Math.max(1, dia), ultimo)).padStart(2, "0")}`;
}

export type ImpuestoPeriodo = {
  periodo: string;
  debito: number;
  credito: number;
  /** IVA a pagar del período: débito − crédito, nunca bajo 0 (el remanente a favor no es un ingreso del flujo). */
  iva: number;
  /** PPM: tasa sobre las ventas netas y exentas del período. */
  ppm: number;
};

/** IVA a pagar y PPM de cada período con movimiento. `tasaPpmBps`: puntos base sobre ventas (100 = 1 %). */
export function impuestosPorPeriodo(o: {
  ventas: readonly DocumentoImpuesto[];
  compras: readonly DocumentoImpuesto[];
  tasaPpmBps: number;
}): ImpuestoPeriodo[] {
  const acum = new Map<string, { debito: number; credito: number; base: number }>();
  const tomar = (p: string) => acum.get(p) ?? { debito: 0, credito: 0, base: 0 };
  for (const v of o.ventas) {
    const p = periodoDeFecha(v.fecha);
    const a = tomar(p);
    a.debito += signo(v.tipoDte) * v.montoIva;
    a.base += signo(v.tipoDte) * (v.montoNeto + v.montoExento);
    acum.set(p, a);
  }
  for (const c of o.compras) {
    const p = periodoDeFecha(c.fecha);
    const a = tomar(p);
    a.credito += signo(c.tipoDte) * c.montoIva;
    acum.set(p, a);
  }
  return [...acum.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodo, a]) => ({
      periodo,
      debito: a.debito,
      credito: a.credito,
      iva: Math.max(0, a.debito - a.credito),
      ppm: Math.max(0, Math.round((a.base * o.tasaPpmBps) / PPM_ESCALA_BPS)),
    }));
}

export type PagoImpuesto = { tipo: "iva" | "ppm"; periodo: string; fecha: string; monto: number; postergado: boolean };

/** Pagos del período: PPM en M+1 siempre; IVA en M+1, o en M+2 si ese mes está marcado como postergado. */
export function pagosDeImpuestos(
  impuestos: readonly ImpuestoPeriodo[],
  diaPago: number,
  postergados: ReadonlySet<string>,
): PagoImpuesto[] {
  const out: PagoImpuesto[] = [];
  for (const i of impuestos) {
    const posterga = postergados.has(i.periodo);
    if (i.iva > 0) out.push({ tipo: "iva", periodo: i.periodo, fecha: fechaDePago(sumarMeses(i.periodo, posterga ? 2 : 1), diaPago), monto: i.iva, postergado: posterga });
    if (i.ppm > 0) out.push({ tipo: "ppm", periodo: i.periodo, fecha: fechaDePago(sumarMeses(i.periodo, 1), diaPago), monto: i.ppm, postergado: false });
  }
  return out;
}
