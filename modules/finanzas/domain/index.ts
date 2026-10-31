// Dominio puro del flujo de caja (ADR-026): semanas, saldos por semana y reprogramación. Sin Next,
// React ni base de datos; cada cálculo tiene su test. Fechas como «YYYY-MM-DD» (UTC), semana = lunes.

export type Seccion = "ingreso" | "egreso";
export type Capa = "plan" | "comprometido" | "real";

export type FilaFlujo = { id: string; seccion: Seccion; arrastre: boolean };
export type CeldaFlujo = { filaId: string; semana: string; capa: Capa; monto: number };

/** Diferencia (CLP) entre el saldo sugerido y el del banco que se acepta sin motivo al sellar. */
export const TOLERANCIA_CIERRE_CLP = 1000;

const DIA_MS = 86_400_000;
const aMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const aIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function esFechaIso(iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && aIso(aMs(iso)) === iso;
}

/** Lunes de la semana ISO que contiene la fecha. */
export function lunesDe(iso: string): string {
  const ms = aMs(iso);
  const dia = (new Date(ms).getUTCDay() + 6) % 7;
  return aIso(ms - dia * DIA_MS);
}

export const esLunes = (iso: string) => esFechaIso(iso) && lunesDe(iso) === iso;

export function sumarSemanas(lunes: string, n: number): string {
  return aIso(aMs(lunes) + n * 7 * DIA_MS);
}

/** `cantidad` lunes consecutivos desde `desde`. */
export function semanasDesde(desde: string, cantidad: number): string[] {
  return Array.from({ length: cantidad }, (_, i) => sumarSemanas(desde, i));
}

export type Tono = "peligro" | "alerta" | null;

/** Bajo 0 es peligro; bajo el umbral (si es > 0) es alerta. */
export function tonoDeSaldo(saldo: number, umbral: number): Tono {
  if (saldo < 0) return "peligro";
  return saldo < umbral ? "alerta" : null;
}

export type SemanaCalculada = {
  semana: string;
  ingresos: number;
  egresos: number;
  saldoInicial: number;
  neto: number;
  saldoFinal: number;
  tono: Tono;
};

/** Saldos acumulados por semana: inicial + ingresos − egresos, con el tono contra el umbral. */
export function calcularPlanilla(o: {
  saldoInicial: number;
  umbral: number;
  semanas: readonly string[];
  filas: readonly FilaFlujo[];
  celdas: readonly CeldaFlujo[];
}): SemanaCalculada[] {
  const seccionDe = new Map(o.filas.map((f) => [f.id, f.seccion]));
  const tot = new Map<string, { ing: number; egr: number }>();
  for (const c of o.celdas) {
    const s = seccionDe.get(c.filaId);
    if (!s) continue;
    const t = tot.get(c.semana) ?? { ing: 0, egr: 0 };
    if (s === "ingreso") t.ing += c.monto;
    else t.egr += c.monto;
    tot.set(c.semana, t);
  }
  let saldo = o.saldoInicial;
  return o.semanas.map((semana) => {
    const { ing, egr } = tot.get(semana) ?? { ing: 0, egr: 0 };
    const saldoInicial = saldo;
    saldo += ing - egr;
    return {
      semana,
      ingresos: ing,
      egresos: egr,
      saldoInicial,
      neto: ing - egr,
      saldoFinal: saldo,
      tono: tonoDeSaldo(saldo, o.umbral),
    };
  });
}

export type Movimiento = { desde: string; hasta: string; monto: number };
export type PlanMovimiento =
  { ok: true; movimientos: Movimiento[] } | { ok: false; motivo: string };

/**
 * Reprograma celdas de una fila ± `por` semanas. Solo se mueve la capa Plan (lo comprometido o
 * real viene de hechos y no se mueve); con `arrastre` en la fila se mueven también todas las celdas
 * Plan posteriores (las no-Plan posteriores se quedan donde están) a la primera seleccionada. No se toca una semana sellada, ni de origen ni de
 * destino, y una celda Plan se suma a otra Plan del destino pero nunca pisa una no-Plan.
 */
export function planificarMovimiento(o: {
  fila: FilaFlujo;
  celdas: readonly CeldaFlujo[];
  semanas: readonly string[];
  por: number;
  selladas: ReadonlySet<string>;
}): PlanMovimiento {
  if (!Number.isInteger(o.por) || o.por === 0)
    return { ok: false, motivo: "Indica cuántas semanas mover." };
  const deLaFila = o.celdas.filter((c) => c.filaId === o.fila.id);
  const elegidas = new Set(o.semanas);
  const primera = [...elegidas].sort()[0];
  const origen = deLaFila.filter(
    (c) =>
      elegidas.has(c.semana) ||
      (o.fila.arrastre && primera !== undefined && c.semana > primera && c.capa === "plan"),
  );
  if (!origen.length) return { ok: false, motivo: "No hay celdas para mover en esas semanas." };
  if (origen.some((c) => c.capa !== "plan"))
    return {
      ok: false,
      motivo: "Solo se mueve lo planificado; lo comprometido o real no se reprograma.",
    };
  const movimientos = origen.map((c) => ({
    desde: c.semana,
    hasta: sumarSemanas(c.semana, o.por),
    monto: c.monto,
  }));
  for (const m of movimientos)
    if (o.selladas.has(m.desde) || o.selladas.has(m.hasta))
      return { ok: false, motivo: "Una de las semanas está sellada: reábrela antes de mover." };
  const origenes = new Set(movimientos.map((m) => m.desde));
  for (const m of movimientos) {
    const choca = deLaFila.find((c) => c.semana === m.hasta && !origenes.has(c.semana));
    if (choca && choca.capa !== "plan")
      return { ok: false, motivo: "La semana de destino ya tiene una cifra comprometida o real." };
  }
  return { ok: true, movimientos };
}

/** Diferencia entre el banco y lo sugerido, y si exige motivo para sellar. */
export function evaluarCierre(saldoSugerido: number, saldoBanco: number) {
  const diferencia = saldoBanco - saldoSugerido;
  return { diferencia, exigeMotivo: Math.abs(diferencia) > TOLERANCIA_CIERRE_CLP };
}
