import type { Contexto } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";

import { ajustesDe, hoyIso } from "../util";
import { saldoDelBanco } from "./saldo-banco";
import { aFecha } from "./util";

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
  const { saldo: total } = await saldoDelBanco(tx, { cuentaId, saldo: saldoCuenta });
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
