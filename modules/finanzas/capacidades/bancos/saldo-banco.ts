import type { TenantTx } from "@opai/db";

import { hoyIso } from "../util";

/** Saldo conocido de una cuenta y el día (zona del negocio) al que corresponde. */
export type SaldoCuenta = { cuentaId: string; saldo: number; fecha: string };

export type SaldoBanco = {
  /** Suma de las cuentas activas con saldo conocido; null si ninguna lo tiene. */
  saldo: number | null;
  /** Cuentas activas sin saldo conocido: no suman y la pantalla lo avisa (ADR-073). */
  cuentasSinSaldo: { cuentaId: string; banco: string }[];
  /** Las cuentas que sí suman en `saldo`, cada una con su fecha: la apertura solo resta lo movido hasta esa fecha. */
  cuentasConSaldo: SaldoCuenta[];
};

/**
 * Saldo del banco de hoy: suma de las cuentas activas, cada una con su último saldo conocido y la fecha de ese
 * saldo. De las dos fuentes (el saldo que reportó el banco por Web4Leads y el saldo posterior del último movimiento
 * de la cartola) se toma la más reciente; con la misma fecha, la del banco. La cuenta que se acaba de sincronizar
 * (`actual`) aporta el saldo recién recibido, fechado hoy. Solo lectura.
 */
export async function saldoDelBanco(
  db: TenantTx,
  actual?: { cuentaId: string; saldo: number | null },
): Promise<SaldoBanco> {
  const cuentas = await db.cuentaBancaria.findMany({
    where: { activa: true },
    select: { id: true, banco: true, saldoBanco: true, saldoBancoEn: true, ultimaSyncEn: true },
    orderBy: { createdAt: "asc" },
  });
  const hoy = hoyIso();
  let total = 0;
  const cuentasSinSaldo: SaldoBanco["cuentasSinSaldo"] = [];
  const cuentasConSaldo: SaldoCuenta[] = [];
  for (const c of cuentas) {
    let conocido: SaldoCuenta | null = null;
    if (actual && c.id === actual.cuentaId && actual.saldo != null) {
      conocido = { cuentaId: c.id, saldo: actual.saldo, fecha: hoy };
    } else {
      if (c.saldoBanco != null) {
        const en = c.saldoBancoEn ?? c.ultimaSyncEn;
        conocido = { cuentaId: c.id, saldo: Number(c.saldoBanco), fecha: en ? hoyIso(en) : hoy };
      }
      const ultimo = await db.movimientoBancario.findFirst({
        where: { cuentaId: c.id, saldoDespues: { not: null } },
        orderBy: [{ fecha: "desc" }, { id: "desc" }],
        select: { fecha: true, saldoDespues: true },
      });
      if (ultimo?.saldoDespues != null) {
        const fecha = ultimo.fecha.toISOString().slice(0, 10);
        if (!conocido || fecha > conocido.fecha) conocido = { cuentaId: c.id, saldo: Number(ultimo.saldoDespues), fecha };
      }
    }
    if (!conocido) {
      cuentasSinSaldo.push({ cuentaId: c.id, banco: c.banco });
      continue;
    }
    total += conocido.saldo;
    cuentasConSaldo.push(conocido);
  }
  return { saldo: cuentasConSaldo.length ? total : null, cuentasSinSaldo, cuentasConSaldo };
}
