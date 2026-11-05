import type { Contexto } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";

import { aFecha, type ajustesDe } from "./util";

/** Escritura de saldo inicial y semana de partida, para correr en la misma transacción que las celdas. */
export function escribirAjustes(
  ctx: Contexto,
  base: Awaited<ReturnType<typeof ajustesDe>>,
  hoy: string,
  input: { saldoInicial?: number | undefined; desde?: string | undefined },
) {
  return async (tx: TenantTx): Promise<void> => {
    if (input.saldoInicial == null && !input.desde) return;
    const data = {
      saldoInicial: BigInt(input.saldoInicial ?? base.saldoInicial),
      umbral: BigInt(base.umbral),
      desde: aFecha(input.desde ?? base.desde ?? hoy),
      horizonteSemanas: base.horizonteSemanas,
      calendarioPagos: base.calendarioPagos,
      avisoActivo: base.avisoActivo,
      metaCeldaMs: base.metaCeldaMs,
      metaGuardadoP95Ms: base.metaGuardadoP95Ms,
      metaCargaInicialS: base.metaCargaInicialS,
      metasVisibles: base.metasVisibles,
    };
    const existe = await tx.flujoAjustes.findFirst({});
    if (existe) await tx.flujoAjustes.update({ where: { id: existe.id }, data });
    else await tx.flujoAjustes.create({ data: { ...data, tenantId: ctx.tenantId } });
    await ctx.eventos.emitir(tx, {
      tipo: "finanzas.flujo.ajustes_cambiados",
      entidadTipo: "flujoAjustes",
      entidadId: existe?.id ?? ctx.tenantId,
    });
  };
}
