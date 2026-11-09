// Montos de una programación recurrente (BRIEF-26 · CAR-159): solo enteros (`bigint`) y
// `redondearRazonCLP`. Cantidad con 4 decimales, precio CLP entero o UF escalada (`UF_ESCALA`),
// descuento en centésimas de punto (10.000 = 100 %), UF del día en centavos de CLP.

import { redondearRazonCLP, UF_ESCALA } from "../dinero";
import { ivaDesdeNeto, type MontosDteVenta } from "./ventas";

/** Escala de la cantidad (NUMERIC(14,4)). */
export const CANTIDAD_ESCALA = 10_000;
/** Escala del descuento: centésimas de punto porcentual. */
export const DESCUENTO_ESCALA = 10_000;

export type LineaProgramacionMonto = {
  glosa: string;
  /** Texto decimal con hasta 4 decimales ("0.5", "2.0000"). */
  cantidad: string;
  precioUnitarioClp: bigint | null;
  precioUnitarioUf: bigint | null;
  descuentoPct: number;
  exento: boolean;
};

/** "12,5" o "12.5000" → 125000 (entero escalado por `CANTIDAD_ESCALA`), sin pasar por float. */
export function cantidadEscalada(texto: string): bigint {
  const t = texto.trim().replace(",", ".");
  const m = /^(\d+)(?:\.(\d{0,4})\d*)?$/.exec(t);
  if (!m) throw new RangeError(`Cantidad inválida: ${texto}`);
  return BigInt(m[1]!) * BigInt(CANTIDAD_ESCALA) + BigInt((m[2] ?? "").padEnd(4, "0"));
}

/**
 * Monto CLP exacto de una línea. Las líneas en UF necesitan `ufCentavos`; sin él lanza. La razón
 * completa se arma con enteros y se redondea una sola vez (mitad hacia arriba).
 */
export function montoLineaProgramacion(l: LineaProgramacionMonto, ufCentavos: bigint | null): number {
  const cant = cantidadEscalada(l.cantidad);
  const neto = BigInt(DESCUENTO_ESCALA - Math.min(DESCUENTO_ESCALA, Math.max(0, l.descuentoPct)));
  const base = BigInt(CANTIDAD_ESCALA) * BigInt(DESCUENTO_ESCALA);
  if (l.precioUnitarioClp !== null) {
    return redondearRazonCLP(cant * l.precioUnitarioClp * neto, base);
  }
  if (l.precioUnitarioUf === null) throw new RangeError("La línea no tiene precio.");
  if (ufCentavos === null || ufCentavos <= 0n) throw new RangeError("Falta el valor de la UF.");
  return redondearRazonCLP(
    cant * l.precioUnitarioUf * ufCentavos * neto,
    base * BigInt(UF_ESCALA) * 100n,
  );
}

export const MOTIVO_33_EXENTA = "La factura afecta no admite líneas exentas; use tipo 34 o quite la exención.";
export const MOTIVO_TIPO_NO_GENERABLE =
  "Las notas de débito y crédito no se generan desde una programación; queda pausada.";
export const MOTIVO_SIN_MONTO = "El período no tiene monto a facturar.";
export const MOTIVO_SIN_LINEAS = "La programación no tiene líneas.";

export type LineaCalculada = {
  glosa: string;
  monto: number;
  /** Datos de la línea de la programación para imprimirlos; el precio solo existe si la línea es en CLP. */
  cantidad: string;
  precioUnitario: number | null;
  descuentoPct: number;
};
export type MontosProgramacion =
  | { ok: true; lineas: LineaCalculada[]; montos: MontosDteVenta }
  | { ok: false; motivo: string };

/** Líneas en CLP y montos del DTE (33 afecta o 34 exenta) de un período. */
export function montosProgramacion(
  tipoDte: number,
  lineas: readonly LineaProgramacionMonto[],
  ufCentavos: bigint | null,
): MontosProgramacion {
  if (tipoDte !== 33 && tipoDte !== 34) return { ok: false, motivo: MOTIVO_TIPO_NO_GENERABLE };
  if (lineas.length === 0) return { ok: false, motivo: MOTIVO_SIN_LINEAS };
  if (tipoDte === 33 && lineas.some((l) => l.exento)) return { ok: false, motivo: MOTIVO_33_EXENTA };
  const calculadas = lineas
    .map((l) => ({
      glosa: l.glosa,
      monto: montoLineaProgramacion(l, ufCentavos),
      cantidad: l.cantidad.trim().replace(",", "."),
      precioUnitario: l.precioUnitarioClp === null ? null : Number(l.precioUnitarioClp),
      descuentoPct: l.descuentoPct,
    }))
    .filter((l) => l.monto > 0);
  const bruto = calculadas.reduce((a, l) => a + l.monto, 0);
  if (bruto <= 0) return { ok: false, motivo: MOTIVO_SIN_MONTO };
  const montos: MontosDteVenta =
    tipoDte === 33
      ? { neto: bruto, exento: 0, iva: ivaDesdeNeto(bruto), otros: 0, total: bruto + ivaDesdeNeto(bruto) }
      : { neto: 0, exento: bruto, iva: 0, otros: 0, total: bruto };
  return { ok: true, lineas: calculadas, montos };
}

/** Motivo por el que una programación no puede activarse (o null si puede). */
export function motivoNoActivable(p: {
  tipoDte: number;
  cuentaId: string | null;
  lineas: readonly { exento: boolean }[];
}): string | null {
  if (p.tipoDte !== 33 && p.tipoDte !== 34) return MOTIVO_TIPO_NO_GENERABLE;
  if (!p.cuentaId) return "Asigna la cuenta del cliente.";
  if (p.lineas.length === 0) return MOTIVO_SIN_LINEAS;
  if (p.tipoDte === 33 && p.lineas.some((l) => l.exento)) return MOTIVO_33_EXENTA;
  return null;
}
