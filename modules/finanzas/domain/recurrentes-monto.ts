// Monto de cada cuota de un gasto recurrente según su unidad (CAR-349, bloque 2). Puro y entero: la UF va escalada
// (`UF_ESCALA`, 10.000 = 1 UF) y el porcentaje también (`PCT_ESCALA`, 1.000.000 = 100 %). Nunca inventa un valor:
// si falta la UF del día o las ventas del mes, usa el último dato conocido y marca la cuota como estimada.
import { PCT_ESCALA, UF_ESCALA } from "@opai/domain";

export type UnidadRecurrente = "clp" | "uf" | "pct_ventas";

export type BaseMonto = {
  /** UF publicada para ese día exacto, en centavos de CLP, o null. */
  ufDelDia: (fecha: string) => number | null;
  /** Última UF publicada (para cuotas futuras), o null si no hay ninguna. */
  ufUltima: { fecha: string; centavos: number } | null;
  /** Ventas netas del período «aaaa-mm» (neto + exento, las notas de crédito restan), o null si no hay documentos. */
  ventasNetas: (periodo: string) => number | null;
  /** Último mes CERRADO con ventas (el en curso solo si no hay otro): base para estimar meses que aún no ocurren. */
  ultimoPeriodoConVentas: string | null;
  /** Período en curso «aaaa-mm» (hoy, hora de Chile). */
  periodoActual: string;
};

export type MontoCuota = { monto: number; estimado: boolean; detalle: string | null };

/** Período «aaaa-mm» anterior al de una fecha «aaaa-mm-dd». */
export function periodoAnterior(fecha: string): string {
  const a = Number(fecha.slice(0, 4));
  const m = Number(fecha.slice(5, 7));
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
}

/** a × b / divisor redondeado al entero más cercano (mitades hacia arriba), sin perder precisión. */
function escalar(a: number, b: number, divisor: bigint): number {
  if (a <= 0 || b <= 0) return 0;
  const p = BigInt(a) * BigInt(b);
  return Number((p * 2n + divisor) / (divisor * 2n));
}

const DIVISOR_UF = BigInt(UF_ESCALA) * 100n;
const DIVISOR_PCT = BigInt(PCT_ESCALA);

function enUf(monto: number, fecha: string, b: BaseMonto): MontoCuota {
  const exacta = b.ufDelDia(fecha);
  if (exacta != null) return { monto: escalar(monto, exacta, DIVISOR_UF), estimado: false, detalle: null };
  if (!b.ufUltima) return { monto: 0, estimado: true, detalle: "sin UF publicada" };
  return { monto: escalar(monto, b.ufUltima.centavos, DIVISOR_UF), estimado: true, detalle: `estimado con la UF del ${b.ufUltima.fecha}` };
}

function enPctVentas(monto: number, fecha: string, b: BaseMonto): MontoCuota {
  const periodo = periodoAnterior(fecha);
  if (periodo < b.periodoActual) {
    const base = b.ventasNetas(periodo);
    // Sin documentos ese mes puede ser que aún no se cargan (p. ej. emitidos en otro sistema): 0, pero estimado.
    if (base == null) return { monto: 0, estimado: true, detalle: `sin ventas registradas en ${periodo}` };
    return { monto: escalar(monto, base, DIVISOR_PCT), estimado: false, detalle: `ventas de ${periodo}` };
  }
  if (periodo === b.periodoActual) {
    const base = b.ventasNetas(periodo) ?? 0;
    return { monto: escalar(monto, base, DIVISOR_PCT), estimado: true, detalle: `ventas de ${periodo} hasta hoy` };
  }
  const ultimo = b.ultimoPeriodoConVentas;
  if (!ultimo) return { monto: 0, estimado: true, detalle: "sin ventas registradas" };
  const base = b.ventasNetas(ultimo) ?? 0;
  return { monto: escalar(monto, base, DIVISOR_PCT), estimado: true, detalle: `estimado con las ventas de ${ultimo}` };
}

/** Monto en CLP de la cuota de una fecha. CLP va tal cual; UF y % de ventas se convierten con su base. */
export function montoCuota(r: { unidad: UnidadRecurrente; monto: number }, fecha: string, b: BaseMonto): MontoCuota {
  if (r.unidad === "uf") return enUf(r.monto, fecha, b);
  if (r.unidad === "pct_ventas") return enPctVentas(r.monto, fecha, b);
  return { monto: r.monto, estimado: false, detalle: null };
}
