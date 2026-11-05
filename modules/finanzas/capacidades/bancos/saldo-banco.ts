import type { TenantTx } from "@opai/db";

export type SaldoBanco = {
  /** Suma de las cuentas activas con saldo conocido; null si ninguna lo tiene. */
  saldo: number | null;
  /** Cuentas activas sin saldo conocido: no suman y la pantalla lo avisa (ADR-073). */
  cuentasSinSaldo: { cuentaId: string; banco: string }[];
  /** Cuentas que sí suman en `saldo`: la apertura de la semana solo resta los movimientos de estas. */
  cuentaIdsConSaldo: string[];
};

/**
 * Saldo del banco de hoy: suma de las cuentas activas, cada una con su último saldo conocido. La cuenta que se
 * acaba de sincronizar (`actual`) aporta el saldo recién recibido; las demás, el que dejó Web4Leads o, si no hay,
 * el saldo posterior de su último movimiento de cartola. Solo lectura.
 */
export async function saldoDelBanco(
  db: TenantTx,
  actual?: { cuentaId: string; saldo: number | null },
): Promise<SaldoBanco> {
  const cuentas = await db.cuentaBancaria.findMany({
    where: { activa: true },
    select: { id: true, banco: true, saldoBanco: true },
    orderBy: { createdAt: "asc" },
  });
  let total = 0;
  let alguno = false;
  const cuentasSinSaldo: SaldoBanco["cuentasSinSaldo"] = [];
  const cuentaIdsConSaldo: string[] = [];
  for (const c of cuentas) {
    let saldo: number | null = actual && c.id === actual.cuentaId ? actual.saldo : null;
    if (saldo == null && c.saldoBanco != null) saldo = Number(c.saldoBanco);
    if (saldo == null) {
      const ultimo = await db.movimientoBancario.findFirst({
        where: { cuentaId: c.id, saldoDespues: { not: null } },
        orderBy: [{ fecha: "desc" }, { id: "desc" }],
        select: { saldoDespues: true },
      });
      if (ultimo?.saldoDespues != null) saldo = Number(ultimo.saldoDespues);
    }
    if (saldo == null) {
      cuentasSinSaldo.push({ cuentaId: c.id, banco: c.banco });
      continue;
    }
    total += saldo;
    alguno = true;
    cuentaIdsConSaldo.push(c.id);
  }
  return { saldo: alguno ? total : null, cuentasSinSaldo, cuentaIdsConSaldo };
}
