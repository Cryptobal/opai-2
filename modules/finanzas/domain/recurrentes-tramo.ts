// Cambio de un gasto recurrente «desde una fecha» (CAR-413). Puro. Como Xero o QuickBooks: el cambio rige desde
// una fecha en adelante y las cuotas anteriores no se tocan. El tramo vigente se cierra el día antes y nace uno
// nuevo; el tope de cuotas se reparte para que el total del gasto no crezca.
import { ocurrenciasDe, type Recurrente } from "./recurrentes";

const DIA_MS = 86_400_000;
export const diaAntes = (iso: string, dias = 1): string => new Date(Date.parse(`${iso}T00:00:00Z`) - dias * DIA_MS).toISOString().slice(0, 10);
const masDias = (iso: string, dias: number): string => new Date(Date.parse(`${iso}T00:00:00Z`) + dias * DIA_MS).toISOString().slice(0, 10);

/** Cuántas cuotas muestra la vista previa y hasta cuántos días adelante mira. */
export const CUOTAS_VISTA = 12;
export const DIAS_VISTA = 366;

export type Tramos =
  | { tipo: "en_lugar"; nuevo: Recurrente }
  | { tipo: "partido"; anterior: Recurrente; nuevo: Recurrente };

/**
 * Parte la regla `actual` en `desde` con los datos nuevos (frecuencia y día). Si `desde` no pasa del inicio, no hay
 * cuotas que conservar y el cambio se aplica en el mismo gasto («en_lugar») sin mover su inicio: así nunca adelanta
 * cuotas ni se monta sobre un tramo anterior. Devuelve un motivo si no se puede.
 */
export function partirEn(
  actual: Recurrente,
  desde: string,
  cambios: Pick<Recurrente, "frecuencia" | "diaDelMes">,
): Tramos | { motivo: string } {
  if (actual.fin && desde > actual.fin) return { motivo: "El gasto ya terminó antes de esa fecha." };
  if (desde <= actual.inicio) return { tipo: "en_lugar", nuevo: { ...actual, ...cambios } };
  const anterior = { ...actual, fin: diaAntes(desde) };
  let repeticiones = actual.repeticiones;
  if (repeticiones != null) {
    const hechas = ocurrenciasDe(actual, actual.inicio, diaAntes(desde)).length;
    repeticiones -= hechas;
    if (repeticiones <= 0) return { motivo: "Ese gasto ya no tiene cuotas desde esa fecha." };
  }
  return { tipo: "partido", anterior, nuevo: { ...actual, ...cambios, inicio: desde, repeticiones } };
}

/** Cuotas del tramo vigente desde `desde` que un cargo ya hecho (hasta `hoy`) pudo pagar por adelantado. */
export function cuotasPagablesYa(actual: Recurrente, desde: string, hoy: string, diasAntes: number): string[] {
  return ocurrenciasDe(actual, desde, masDias(hoy, diasAntes));
}

/** Próximas cuotas desde `desde`, antes y después del cambio, para la vista previa. */
export function cuotasQueCambian(actual: Recurrente, nuevo: Recurrente, desde: string): { antes: string[]; despues: string[] } {
  const hasta = masDias(desde, DIAS_VISTA);
  return {
    antes: ocurrenciasDe(actual, desde, hasta).slice(0, CUOTAS_VISTA),
    despues: ocurrenciasDe(nuevo, desde, hasta).slice(0, CUOTAS_VISTA),
  };
}
