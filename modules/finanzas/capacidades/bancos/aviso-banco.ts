import type { Contexto } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";

import { ajustesDe, hoyIso } from "../util";
import { aFecha } from "./util";

/**
 * Saldo del banco de hoy: suma de las cuentas activas, cada una con su último saldo conocido. La cuenta que se
 * acaba de sincronizar aporta el saldo recién recibido; las demás, el que dejó Web4Leads o, si no hay, el saldo
 * posterior de su último movimiento de cartola. Las cuentas sin saldo no suman (ADR-073).
 */
export async function saldoBancoDeHoy(
  tx: TenantTx,
  actual: { cuentaId: string; saldo: number | null },
): Promise<number | null> {
  const cuentas = await tx.cuentaBancaria.findMany({ where: { activa: true }, select: { id: true, saldoBanco: true } });
  let total = 0;
  let alguno = false;
  for (const c of cuentas) {
    let saldo: number | null = c.id === actual.cuentaId ? actual.saldo : null;
    if (saldo == null && c.saldoBanco != null) saldo = Number(c.saldoBanco);
    if (saldo == null) {
      const ultimo = await tx.movimientoBancario.findFirst({
        where: { cuentaId: c.id, saldoDespues: { not: null } },
        orderBy: [{ fecha: "desc" }, { id: "desc" }],
        select: { saldoDespues: true },
      });
      if (ultimo?.saldoDespues != null) saldo = Number(ultimo.saldoDespues);
    }
    if (saldo == null) continue;
    total += saldo;
    alguno = true;
  }
  return alguno ? total : null;
}

/**
 * Emite aviso in-app (campana) si la suma de las cuentas activas queda bajo el umbral único de saldo bajo
 * (decisión de Carlos, CAR-193). Como máximo un aviso por día para toda la empresa.
 */
export async function sincronizarAvisoSaldoBajo(
  ctx: Contexto,
  tx: TenantTx,
  cuentaId: string,
  saldoCuenta: number | null,
): Promise<void> {
  const ajustes = await ajustesDe(ctx);
  if (!ajustes.avisoActivo) return;
  const total = await saldoBancoDeHoy(tx, { cuentaId, saldo: saldoCuenta });
  if (total == null || total >= ajustes.umbral) return;
  const dia = aFecha(hoyIso());
  if (await tx.bancoAvisoEmitido.findFirst({ where: { dia }, select: { id: true } })) return;
  const { count } = await tx.bancoAvisoEmitido.createMany({
    data: [{ tenantId: ctx.tenantId, cuentaId, dia, saldo: BigInt(total) }],
    skipDuplicates: true,
  });
  if (!count) return;
  const row = await tx.bancoAvisoEmitido.findFirst({ where: { tenantId: ctx.tenantId, cuentaId, dia } });
  if (!row) return;
  await ctx.eventos.emitir(tx, {
    tipo: "finanzas.banco.saldo_bajo_avisado",
    entidadTipo: "bancoAvisoEmitido",
    entidadId: row.id,
    payload: { saldo: total, umbral: ajustes.umbral },
  });
}
