// Ropa de Inventario (CAR-237, ADR-116; referente Snipe-IT: artículos por existencias con historial de
// movimientos). Reglas R15 a R18 de docs/2.0/modulos/inventario.md.
import { normalizarTalla } from "./tipos";

export const MOTIVOS_MOVIMIENTO = ["ingreso", "ajuste", "entrega", "devolucion"] as const;
export type MotivoMovimiento = (typeof MOTIVOS_MOVIMIENTO)[number];

export const ETIQUETA_MOTIVO: Readonly<Record<MotivoMovimiento, string>> = {
  ingreso: "Ingreso",
  ajuste: "Ajuste",
  entrega: "Entrega",
  devolucion: "Devolución",
};

export const LIMITES_ROPA = { cantidadMax: 100_000, notaMax: 300 } as const;

/**
 * R15 y R16: agrupa las líneas de un ingreso por talla (normalizada) y valida que cada talla sea del
 * tipo y que la cantidad sea positiva. Devuelve las líneas sumadas o el error de negocio.
 */
export function lineasDeIngreso(
  tallasDelTipo: readonly string[],
  lineas: readonly { talla: string; cantidad: number }[],
): { ok: true; lineas: { talla: string; cantidad: number }[] } | { ok: false; error: string } {
  const validas = new Set(tallasDelTipo.map(normalizarTalla));
  const suma = new Map<string, number>();
  for (const l of lineas) {
    const talla = normalizarTalla(l.talla);
    if (!validas.has(talla)) return { ok: false, error: `La talla «${l.talla}» no es de este tipo.` };
    if (!Number.isInteger(l.cantidad) || l.cantidad <= 0)
      return { ok: false, error: "Cada cantidad debe ser un número entero mayor que cero." };
    suma.set(talla, (suma.get(talla) ?? 0) + l.cantidad);
  }
  if (suma.size === 0) return { ok: false, error: "Indica al menos una talla con cantidad." };
  return { ok: true, lineas: [...suma].map(([talla, cantidad]) => ({ talla, cantidad })) };
}

/** R17: las existencias nunca quedan bajo cero. */
export function existenciaResultante(actual: number, delta: number): number | null {
  const nueva = actual + delta;
  return nueva < 0 || nueva > LIMITES_ROPA.cantidadMax ? null : nueva;
}
