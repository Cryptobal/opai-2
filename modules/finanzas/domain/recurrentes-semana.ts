// Qué aporta cada cuota de un gasto recurrente al flujo desde la semana en curso (CAR-349). Puro.
import { lunesDe } from "./index";
import type { EstadoOcurrencia } from "./recurrentes";

export type CuotaFlujo = { fecha: string; semana: string; monto: number; estado: EstadoOcurrencia["estado"] };

/**
 * La apertura de la semana en curso es el saldo al cierre del domingo (CAR-343): un cargo anterior al lunes ya está
 * en ella, uno de esta semana no. Por eso cada cuota aporta lo que falta pagar más lo pagado con un cargo de esta
 * semana o posterior. Una cuota vencida e impaga pasa a la semana en curso; las de semanas futuras quedan en la suya.
 */
export function cuotasDelFlujo(
  estados: readonly EstadoOcurrencia[],
  monto: number,
  fechaCargo: (id: string) => string | undefined,
  lunesActual: string,
): CuotaFlujo[] {
  const out: CuotaFlujo[] = [];
  for (const e of estados) {
    const pagado = monto - e.pendiente;
    const fc = e.cargoId ? fechaCargo(e.cargoId) : undefined;
    const pagadoEnSemana = fc && fc >= lunesActual ? pagado : 0;
    const aporte = e.pendiente + pagadoEnSemana;
    if (aporte <= 0) continue;
    const semana = lunesDe(e.fecha) < lunesActual || (fc && fc >= lunesActual && lunesDe(fc) === lunesActual) ? lunesActual : lunesDe(e.fecha);
    out.push({ fecha: e.fecha, semana, monto: aporte, estado: e.estado });
  }
  return out;
}
