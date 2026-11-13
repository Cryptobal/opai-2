// Qué aporta cada cuota de un gasto recurrente al flujo desde la semana en curso (CAR-349). Puro.
import { lunesDe } from "./index";
import type { EstadoOcurrencia } from "./recurrentes";

export type CuotaFlujo = { fecha: string; semana: string; monto: number; estado: EstadoOcurrencia["estado"] };

/**
 * La apertura de la semana en curso es el saldo al cierre del domingo (CAR-343): un cargo anterior al lunes ya está
 * en ella, uno de esta semana no. Por eso cada cuota aporta lo que falta pagar más el cargo completo con que se pagó
 * esta semana o después. Una cuota vencida e impaga pasa a la semana en curso; las de semanas futuras quedan en la suya.
 */
export function cuotasDelFlujo(
  estados: readonly EstadoOcurrencia[],
  monto: number,
  cargoDe: (id: string) => { fecha: string; monto: number } | undefined,
  lunesActual: string,
): CuotaFlujo[] {
  const out: CuotaFlujo[] = [];
  for (const e of estados) {
    const cargo = e.cargoId ? cargoDe(e.cargoId) : undefined;
    const fc = cargo?.fecha;
    // Un cargo de esta semana no está en la apertura: suma entero, aunque sea mayor que la cuota.
    const pagadoEnSemana = cargo && cargo.fecha >= lunesActual ? Math.abs(cargo.monto) : 0;
    const aporte = e.pendiente + pagadoEnSemana;
    if (aporte <= 0) continue;
    const semana = lunesDe(e.fecha) < lunesActual || (fc && fc >= lunesActual && lunesDe(fc) === lunesActual) ? lunesActual : lunesDe(e.fecha);
    out.push({ fecha: e.fecha, semana, monto: aporte, estado: e.estado });
  }
  return out;
}
