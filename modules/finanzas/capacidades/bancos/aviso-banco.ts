import type { Contexto } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";

import { ajustesDe } from "../util";
import { aFecha } from "./util";

/** Emite aviso in-app si el saldo de cartola queda bajo el umbral configurado del flujo. */
export async function sincronizarAvisoSaldoBajo(
  ctx: Contexto,
  tx: TenantTx,
  cuentaId: string,
  saldo: number | null,
): Promise<void> {
  if (saldo == null) return;
  const ajustes = await ajustesDe(ctx);
  if (!ajustes.avisoActivo) return;
  if (saldo >= ajustes.avisoUmbral) return;
  const dia = new Date().toISOString().slice(0, 10);
  const { count } = await tx.bancoAvisoEmitido.createMany({
    data: [{ tenantId: ctx.tenantId, cuentaId, dia: aFecha(dia), saldo: BigInt(saldo) }],
    skipDuplicates: true,
  });
  if (!count) return;
  const row = await tx.bancoAvisoEmitido.findFirst({
    where: { tenantId: ctx.tenantId, cuentaId, dia: aFecha(dia) },
  });
  if (!row) return;
  await ctx.eventos.emitir(tx, {
    tipo: "finanzas.banco.saldo_bajo_avisado",
    entidadTipo: "bancoAvisoEmitido",
    entidadId: row.id,
    payload: { saldo, umbral: ajustes.avisoUmbral },
  });
}
