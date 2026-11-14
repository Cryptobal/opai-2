import type { Contexto } from "@opai/capabilities";
import { esRemuneracion } from "@opai/domain";

import { sincronizarAvisoSaldoBajo } from "./aviso-banco";
import { aplicarReglasBanco } from "./reglas-aplicar";
import type { VinculoExterno } from "./sincronizar-cartola";
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
  p: { cuentaId: string; nuevos: MovimientoNuevo[]; vinculos?: (VinculoExterno & { movimiento: MovimientoNuevo })[]; duplicados: number; sospechosos: number; saldoBanco: number | null; saldoBancoEn: Date | null; saldoExplicito?: boolean },
): Promise<number> {
  return ctx.transaccion(async (tx) => {
    // CAR-341: el movimiento que ya estaba por cartola recibe su id externo. CAR-488: si otra entrega ya lo tomó, el
    // entrante no se pierde: pasa a insertarse (si es la misma operación, su id externo repetido lo descarta).
    const aInsertar = [...p.nuevos];
    for (const v of p.vinculos ?? []) {
      const r = await tx.movimientoBancario.updateMany({ where: { id: v.existenteId, idExterno: null }, data: { idExterno: v.idExterno } });
      if (r.count === 0) aInsertar.push(v.movimiento);
    }
    // Ids externos que ya existían antes de este lote: una entrega repetida no vuelve a evaluar reglas sobre ellos.
    const previos = aInsertar.length
      ? await tx.movimientoBancario.findMany({
          where: { cuentaId: p.cuentaId, idExterno: { in: aInsertar.map((m) => m.idExterno) } },
          select: { idExterno: true },
        })
      : [];
    const yaEstaban = new Set(previos.map((m) => m.idExterno));
    const { count } = aInsertar.length
      ? await tx.movimientoBancario.createMany({
          skipDuplicates: true,
          data: aInsertar.map((m) => ({
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
          where: { cuentaId: p.cuentaId, idExterno: { in: aInsertar.map((m) => m.idExterno).filter((x) => !yaEstaban.has(x)) } },
          select: { id: true },
        })
      : [];
    const reglas = llegados.length
      ? await aplicarReglasBanco(ctx, tx, { movimientoIds: llegados.map((m) => m.id) })
      : { conciliados: 0, sugeridos: 0 };
    const previo = await tx.cuentaBancaria.findUnique({ where: { id: p.cuentaId }, select: { saldoBanco: true, saldoBancoEn: true } });
    const saldo = p.saldoBanco != null && saldoVigente(p, count, previo) ? p.saldoBanco : null;
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

/**
 * ¿El saldo recibido reemplaza al guardado? El saldo de la cuenta que informa el banco (`accountBalance`) manda por
 * su fecha: entra si no había saldo o si es igual o más reciente, aunque no traiga movimientos nuevos (CAR-345). El
 * saldo deducido del último movimiento solo entra con movimientos nuevos: una entrega repetida podría ser antigua.
 */
function saldoVigente(
  p: { saldoBancoEn: Date | null; saldoExplicito?: boolean },
  nuevos: number,
  previo: { saldoBanco: bigint | null; saldoBancoEn: Date | null } | null,
): boolean {
  if (previo?.saldoBanco == null) return true;
  if (p.saldoExplicito && p.saldoBancoEn) return !previo.saldoBancoEn || p.saldoBancoEn >= previo.saldoBancoEn;
  return nuevos > 0;
}
