// Monto de cada cuota de un gasto recurrente según su unidad (CAR-349, bloque 2). Puro y entero: la UF va escalada
// (`UF_ESCALA`, 10.000 = 1 UF) y el porcentaje también (`PCT_ESCALA`, 1.000.000 = 100 %). Nunca inventa un valor:
// si falta la UF del día o las ventas del mes, usa el último dato conocido y marca la cuota como estimada.
import { PCT_ESCALA, UF_ESCALA } from "@opai/domain";

export type UnidadRecurrente = "clp" | "uf" | "pct_ventas";
/** Qué día de UF se usa en cada cuota (paridad con OPAI 1). Por defecto, el día de la cuota. */
export type PoliticaUf = "dia_cuota" | "fin_de_mes" | "fin_mes_anterior" | "inicio_de_mes" | "dia_fijo";

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
  /**
   * Ventas netas aún no emitidas del período (programaciones sin generar y borradores), o null si no hay nada
   * programado (CAR-374). Solo se usa para meses que no han cerrado.
   */
  ventasProgramadas?: (periodo: string) => number | null;
};

export type MontoCuota = { monto: number; estimado: boolean; detalle: string | null };

/** Período «aaaa-mm» anterior al de una fecha «aaaa-mm-dd». */
export function periodoAnterior(fecha: string): string {
  const a = Number(fecha.slice(0, 4));
  const m = Number(fecha.slice(5, 7));
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
}

const ultimoDia = (a: number, m0: number) => new Date(Date.UTC(a, m0 + 1, 0)).getUTCDate();
const iso = (a: number, m0: number, d: number) => new Date(Date.UTC(a, m0, d)).toISOString().slice(0, 10);

/** Día cuya UF se usa para la cuota de `fecha`; `diaFijo` (1–31) solo con «dia_fijo», ajustado a meses cortos. */
export function fechaUf(politica: PoliticaUf, diaFijo: number | null, fecha: string): string {
  const a = Number(fecha.slice(0, 4));
  const m0 = Number(fecha.slice(5, 7)) - 1;
  if (politica === "fin_de_mes") return iso(a, m0, ultimoDia(a, m0));
  if (politica === "inicio_de_mes") return iso(a, m0, 1);
  if (politica === "fin_mes_anterior") return iso(a, m0, 0);
  if (politica === "dia_fijo") return iso(a, m0, Math.min(Math.max(1, diaFijo ?? 1), ultimoDia(a, m0)));
  return fecha;
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
  if (exacta != null) return { monto: escalar(monto, exacta, DIVISOR_UF), estimado: false, detalle: `UF del ${fecha}` };
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
  const programado = b.ventasProgramadas?.(periodo) ?? null;
  if (periodo === b.periodoActual) {
    const base = (b.ventasNetas(periodo) ?? 0) + (programado ?? 0);
    const detalle = programado ? `ventas de ${periodo} hasta hoy más lo programado` : `ventas de ${periodo} hasta hoy`;
    return { monto: escalar(monto, base, DIVISOR_PCT), estimado: true, detalle };
  }
  if (programado && programado > 0) {
    const base = (b.ventasNetas(periodo) ?? 0) + programado;
    return { monto: escalar(monto, base, DIVISOR_PCT), estimado: true, detalle: `estimado con lo programado para ${periodo}` };
  }
  const ultimo = b.ultimoPeriodoConVentas;
  if (!ultimo) return { monto: 0, estimado: true, detalle: "sin ventas registradas" };
  const base = b.ventasNetas(ultimo) ?? 0;
  return { monto: escalar(monto, base, DIVISOR_PCT), estimado: true, detalle: `estimado con las ventas de ${ultimo}` };
}

export type ReglaMonto = { unidad: UnidadRecurrente; monto: number; politicaUf?: PoliticaUf; ufDiaFijo?: number | null };

/** Monto en CLP de la cuota de una fecha. CLP va tal cual; UF y % de ventas se convierten con su base. */
export function montoCuota(r: ReglaMonto, fecha: string, b: BaseMonto): MontoCuota {
  if (r.unidad === "uf") return enUf(r.monto, fechaUf(r.politicaUf ?? "dia_cuota", r.ufDiaFijo ?? null, fecha), b);
  if (r.unidad === "pct_ventas") return enPctVentas(r.monto, fecha, b);
  return { monto: r.monto, estimado: false, detalle: null };
}
