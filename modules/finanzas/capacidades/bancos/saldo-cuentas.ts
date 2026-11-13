import type { TenantTx } from "@opai/db";

import { saldoAlCierre, type MovimientoSaldo } from "../../domain/cuadratura";
import { aNumeroSeguro } from "../esquemas";
import { aFecha, aIso, hoyIso } from "../util";
import { saldoDelBanco } from "./saldo-banco";

export type SaldoDeCuenta = { saldoHoy: number; saldoDesde: string };

/**
 * Saldo de hoy de cada cuenta activa (CAR-341): su último saldo conocido (banco en línea, último movimiento con
 * saldo o cierre de la última cartola) llevado hasta hoy con los movimientos posteriores. Solo lectura.
 */
export async function saldosDeCuentas(db: TenantTx): Promise<Map<string, SaldoDeCuenta>> {
  const { cuentasConSaldo } = await saldoDelBanco(db);
  const out = new Map<string, SaldoDeCuenta>();
  if (!cuentasConSaldo.length) return out;
  const hoy = hoyIso();
  const desde = cuentasConSaldo.map((c) => c.fecha).sort()[0] as string;
  const filas = await db.movimientoBancario.findMany({
    where: {
      estado: { not: "ignorado" },
      cuentaId: { in: cuentasConSaldo.map((c) => c.cuentaId) },
      fecha: { gt: aFecha(desde), lte: aFecha(hoy) },
    },
    select: { cuentaId: true, fecha: true, monto: true },
  });
  const porCuenta = new Map<string, MovimientoSaldo[]>();
  for (const f of filas) {
    const lista = porCuenta.get(f.cuentaId) ?? [];
    lista.push({ fecha: aIso(f.fecha), monto: aNumeroSeguro(f.monto) });
    porCuenta.set(f.cuentaId, lista);
  }
  for (const c of cuentasConSaldo) {
    out.set(c.cuentaId, { saldoHoy: saldoAlCierre(c, porCuenta.get(c.cuentaId) ?? [], hoy), saldoDesde: c.fecha });
  }
  return out;
}
