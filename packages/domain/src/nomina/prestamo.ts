import { MAX_CUOTAS_PRESTAMO } from "./tipos";

export type CuotaPlan = { numero: number; anio: number; mes: number; monto: number };

export type EntradaPlan = {
  /** Monto total del préstamo en CLP, entero > 0. */
  montoTotal: number;
  cuotas: number;
  primeraCuotaAnio: number;
  primeraCuotaMes: number;
};

/**
 * Plan de cuotas mensuales de un préstamo (B3, sin interés): CLP enteros. Las primeras cuotas valen
 * `floor(total / n)` y la última absorbe el resto, para que la suma sea exactamente el total. Lanza
 * `RangeError` si el monto o el número de cuotas no son enteros válidos (nunca float para dinero).
 */
export function planDeCuotas(e: EntradaPlan): CuotaPlan[] {
  if (!Number.isSafeInteger(e.montoTotal) || e.montoTotal <= 0)
    throw new RangeError("El monto del préstamo debe ser un entero mayor que cero.");
  if (!Number.isInteger(e.cuotas) || e.cuotas < 1 || e.cuotas > MAX_CUOTAS_PRESTAMO)
    throw new RangeError(`Las cuotas deben ser un entero entre 1 y ${MAX_CUOTAS_PRESTAMO}.`);
  if (e.montoTotal < e.cuotas)
    throw new RangeError("El monto no alcanza para una cuota de al menos $ 1 por mes.");
  if (!Number.isInteger(e.primeraCuotaMes) || e.primeraCuotaMes < 1 || e.primeraCuotaMes > 12)
    throw new RangeError("El mes de la primera cuota debe estar entre 1 y 12.");
  const base = Math.floor(e.montoTotal / e.cuotas);
  const plan: CuotaPlan[] = [];
  let anio = e.primeraCuotaAnio;
  let mes = e.primeraCuotaMes;
  for (let n = 1; n <= e.cuotas; n++) {
    const monto = n === e.cuotas ? e.montoTotal - base * (e.cuotas - 1) : base;
    plan.push({ numero: n, anio, mes, monto });
    if (mes === 12) {
      anio += 1;
      mes = 1;
    } else mes += 1;
  }
  return plan;
}

export type CuotaEstado = { monto: number; estado: "pendiente" | "descontada" | "condonada" };

/** Saldo por descontar: suma de cuotas pendientes (las condonadas no se cobran). */
export function saldoPrestamo(cuotas: readonly CuotaEstado[]): number {
  return cuotas.filter((c) => c.estado === "pendiente").reduce((s, c) => s + c.monto, 0);
}

/** El préstamo queda «pagado» cuando ninguna cuota sigue pendiente. */
export function prestamoSaldado(cuotas: readonly CuotaEstado[]): boolean {
  return cuotas.length > 0 && cuotas.every((c) => c.estado !== "pendiente");
}
