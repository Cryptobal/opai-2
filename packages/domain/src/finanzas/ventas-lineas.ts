// Líneas y totales de una factura 33/34 (CAR-228). Lógica pura: la pantalla, la capacidad y el PDF usan el mismo cálculo.
import { ivaDesdeNeto, type MontosDteVenta } from "./ventas";

export type LineaVentaCalculo = {
  /** Texto decimal con hasta 4 decimales («2», «0,5»). */
  cantidad: string;
  /** Pesos enteros, antes del descuento. */
  precioUnitario: number;
  /** Centésimas de punto porcentual (1550 = 15,50 %). */
  descuentoPct: number;
};

/** Escalas de la cantidad (4 decimales) y del descuento (centésimas de punto): mismas que las de la programación. */
const ESCALA = 10_000n;

/**
 * Monto neto de una línea en pesos enteros: cantidad × precio × (1 − descuento), redondeado una sola vez (mitad
 * hacia arriba). Misma fórmula que `montoLineaProgramacion` en CLP. El redondeo va aquí y no con `redondearRazonCLP`:
 * importarla desde la pantalla la sumaba al módulo `dinero` de otras rutas (presupuesto de JS, ADR-037).
 */
export function montoLineaVenta(l: LineaVentaCalculo): number {
  const m = /^(\d+)(?:[.,](\d{0,4})\d*)?$/.exec(l.cantidad.trim());
  if (!m) throw new RangeError(`Cantidad inválida: ${l.cantidad}`);
  const cantidad = BigInt(m[1]!) * ESCALA + BigInt((m[2] ?? "").padEnd(4, "0"));
  const descuento = BigInt(Math.min(10_000, Math.max(0, l.descuentoPct)));
  const numerador = cantidad * BigInt(l.precioUnitario) * (ESCALA - descuento);
  const base = ESCALA * ESCALA;
  return Number((2n * numerador + base) / (2n * base));
}

/** Neto, IVA y total de una factura: la afecta (33) suma neto + IVA 19 %; la exenta (34) no lleva IVA. */
export function totalesVenta(tipo: 33 | 34, montos: readonly number[]): MontosDteVenta {
  const bruto = montos.reduce((a, m) => a + m, 0);
  if (tipo === 33) {
    const iva = ivaDesdeNeto(bruto);
    return { neto: bruto, exento: 0, iva, otros: 0, total: bruto + iva };
  }
  return { neto: 0, exento: bruto, iva: 0, otros: 0, total: bruto };
}
