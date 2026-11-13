import { fechaDdMmAaaa } from "../../flujo/_componentes/datos";
import type { CuentaBanco } from "./bancos-tipos";

const FUENTE = { banco: "saldo informado por el banco", movimiento: "saldo del último movimiento", cartola: "cierre de la cartola" } as const;

/**
 * De dónde sale el saldo de hoy (CAR-341): «Cierre de la cartola al 30-10-2026 + 12 movimientos posteriores». Así se
 * entiende si el número viene del banco o se calculó sumando movimientos.
 */
export function origenSaldo(c: Pick<CuentaBanco, "saldoDesde" | "saldoFuente" | "saldoMovimientosDespues">): string | null {
  if (!c.saldoDesde) return null;
  const base = `${c.saldoFuente ? FUENTE[c.saldoFuente] : "último saldo conocido"} al ${fechaDdMmAaaa(c.saldoDesde)}`;
  const n = c.saldoMovimientosDespues ?? 0;
  const texto = n > 0 ? `${base} + ${n} movimiento${n === 1 ? "" : "s"} posterior${n === 1 ? "" : "es"}` : base;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
