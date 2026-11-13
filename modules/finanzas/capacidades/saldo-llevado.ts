import type { TenantTx } from "@opai/db";

import { saldoAlCierre, type MovimientoSaldo } from "../domain/cuadratura";
import type { SaldoBanco } from "./bancos/saldo-banco";
import { aNumeroSeguro } from "./esquemas";
import { aFecha, aIso, hoyIso } from "./util";

const DIA_MS = 86_400_000;
const diaAnterior = (iso: string) => new Date(Date.parse(`${iso}T00:00:00Z`) - DIA_MS).toISOString().slice(0, 10);

export type SaldoLlevado = {
  /** Suma de las cuentas con saldo conocido, al cierre del domingo anterior a la semana en curso. */
  apertura: number;
  /** La misma suma al cierre de hoy: el saldo conocido más lo que la cartola movió después. */
  hoy: number;
  /** Fecha del saldo conocido más antiguo: desde ahí se confía en la cartola. */
  desde: string | null;
};

/**
 * Lleva el saldo conocido de cada cuenta desde su fecha hasta el inicio de la semana en curso y hasta hoy con los
 * movimientos de la cartola (CAR-343). Un saldo antiguo (apertura, o el último movimiento que lo trae) ya no se toma
 * como si fuera el de hoy. El saldo de un día incluye lo movido ese día. Una sola consulta. Solo lectura.
 */
export async function llevarSaldo(db: TenantTx, banco: SaldoBanco, lunes: string): Promise<SaldoLlevado> {
  const cuentas = banco.cuentasConSaldo;
  if (!cuentas.length) return { apertura: 0, hoy: 0, desde: null };
  const hoy = hoyIso();
  const domingo = diaAnterior(lunes);
  const fechas = cuentas.map((c) => c.fecha);
  const desde = [...fechas, domingo].sort()[0] as string;
  const hasta = [...fechas, hoy].sort().at(-1) as string;
  const filas = await db.movimientoBancario.findMany({
    where: {
      estado: { not: "ignorado" },
      cuentaId: { in: cuentas.map((c) => c.cuentaId) },
      fecha: { gt: aFecha(desde), lte: aFecha(hasta) },
    },
    select: { cuentaId: true, fecha: true, monto: true },
  });
  const porCuenta = new Map<string, MovimientoSaldo[]>();
  for (const f of filas) {
    const lista = porCuenta.get(f.cuentaId) ?? [];
    lista.push({ fecha: aIso(f.fecha), monto: aNumeroSeguro(f.monto) });
    porCuenta.set(f.cuentaId, lista);
  }
  let apertura = 0;
  let alDia = 0;
  for (const c of cuentas) {
    const movs = porCuenta.get(c.cuentaId) ?? [];
    apertura += saldoAlCierre(c, movs, domingo);
    alDia += saldoAlCierre(c, movs, hoy);
  }
  return { apertura, hoy: alDia, desde: [...fechas].sort()[0] ?? null };
}
