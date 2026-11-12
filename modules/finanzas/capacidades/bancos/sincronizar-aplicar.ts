import type { Contexto } from "@opai/capabilities";
import { esRemuneracion } from "@opai/domain";

import { sincronizarAvisoSaldoBajo } from "./aviso-banco";
import { aplicarReglasBanco } from "./reglas-aplicar";
import { aFecha } from "./util";

export type MovimientoNuevo = {
  idExterno: string;
  fecha: string;
  monto: number;
  glosa: string;
  referencia: string | null;
  saldoDespues: number | null;
  claveDedupe: string;
};

/**
 * Inserta los movimientos nuevos, marca la sincronización de la cuenta y avisa si el saldo quedó bajo
 * el umbral, todo en una transacción. Ante una carrera con otra entrega, `skipDuplicates` descarta la
 * fila repetida (id externo o huella ya guardados) en vez de fallar el lote.
 */
export async function aplicarSincronizacion(
  ctx: Contexto,
  p: { cuentaId: string; nuevos: MovimientoNuevo[]; duplicados: number; sospechosos: number; saldoBanco: number | null; saldoBancoEn: Date | null },
): Promise<number> {
  return ctx.transaccion(async (tx) => {
    const { count } = p.nuevos.length
      ? await tx.movimientoBancario.createMany({
          skipDuplicates: true,
          data: p.nuevos.map((m) => ({
            tenantId: ctx.tenantId,
            cuentaId: p.cuentaId,
            fecha: aFecha(m.fecha),
            monto: BigInt(m.monto),
            glosa: m.glosa,
            referencia: m.referencia,
            saldoDespues: m.saldoDespues != null ? BigInt(m.saldoDespues) : null,
            claveDedupe: m.claveDedupe,
            idExterno: m.idExterno,
            estado: esRemuneracion(m.glosa) ? "por_autorizar" : "pendiente",
            origen: "web4leads",
          })),
        })
      : { count: 0 };
    // Reglas del banco (ADR-074) sobre lo recién llegado: por id externo, dentro de la misma transacción.
    const llegados = count
      ? await tx.movimientoBancario.findMany({
          where: { cuentaId: p.cuentaId, idExterno: { in: p.nuevos.map((m) => m.idExterno) } },
          select: { id: true },
        })
      : [];
    const reglas = llegados.length
      ? await aplicarReglasBanco(ctx, tx, { movimientoIds: llegados.map((m) => m.id) })
      : { conciliados: 0, sugeridos: 0 };
    // Una entrega repetida (sin movimientos nuevos) no pisa un saldo que ya se tenía: podría ser más antiguo.
    const previo = await tx.cuentaBancaria.findUnique({ where: { id: p.cuentaId }, select: { saldoBanco: true } });
    const saldo = p.saldoBanco != null && (count > 0 || previo?.saldoBanco == null) ? p.saldoBanco : null;
    await tx.cuentaBancaria.update({
      where: { id: p.cuentaId },
      data: {
        ultimaSyncEn: new Date(),
        ...(saldo != null ? { saldoBanco: BigInt(saldo), saldoBancoEn: p.saldoBancoEn ?? new Date() } : {}),
      },
    });
    await sincronizarAvisoSaldoBajo(ctx, tx, p.cuentaId, saldo);
    await ctx.eventos.emitir(tx, {
      tipo: "finanzas.banco.movimientos_sincronizados",
      entidadTipo: "cuentaBancaria",
      entidadId: p.cuentaId,
      payload: { nuevos: count, duplicados: p.duplicados, sospechosos: p.sospechosos, ...reglas },
    });
    return count;
  });
}
