// Prorrateo de un abono entre varias facturas (BRIEF-34 · CAR-169). Puro y en enteros (CLP).

export type Pendiente = { id: string; pendiente: number };
export type Asignacion = { id: string; monto: number };

/**
 * Reparte `abono` en el orden dado, cubriendo cada factura hasta su saldo pendiente. Nunca asigna más
 * que el pendiente ni más que lo que queda del abono. `sobrante` es lo que ninguna factura absorbió.
 */
export function prorratearAbono(abono: number, items: readonly Pendiente[]): { asignaciones: Asignacion[]; sobrante: number } {
  let resto = Math.max(0, Math.trunc(abono));
  const asignaciones: Asignacion[] = [];
  for (const it of items) {
    const monto = Math.min(resto, Math.max(0, Math.trunc(it.pendiente)));
    asignaciones.push({ id: it.id, monto });
    resto -= monto;
  }
  return { asignaciones, sobrante: resto };
}

/** Diferencia entre el abono y lo asignado (0 = cuadra). Positiva si falta asignar. */
export const diferenciaAsignada = (abono: number, asignaciones: readonly Asignacion[]) =>
  Math.trunc(abono) - asignaciones.reduce((s, a) => s + Math.trunc(a.monto), 0);
