import type { Contexto } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";

import { copiaDe } from "./descartes-copia";
import { aFecha } from "./util";

type Fila = Awaited<ReturnType<TenantTx["movimientoBancario"]["findFirstOrThrow"]>>;

/**
 * CAR-412: saca movimientos de la cuenta dejando un descarte restaurable (quién, cuándo, motivo y copia exacta).
 * Lo usan «Borrar por fechas» y los sobrantes del banco en línea al importar una cartola (CAR-450). Corre dentro de
 * la transacción de quien llama; borra solo propuestas sin confirmar (una confirmada aborta todo por la FK).
 */
export async function descartarMovimientos(
  ctx: Contexto,
  tx: TenantTx,
  p: { cuentaId: string; desde: string; hasta: string; origen: "web4leads" | "manual"; motivo: string; movimientos: Fila[] },
): Promise<string> {
  const ids = p.movimientos.map((m) => m.id);
  const descarte = await tx.movimientoBancarioDescarte.create({
    data: {
      tenantId: ctx.tenantId,
      cuentaId: p.cuentaId,
      desde: aFecha(p.desde),
      hasta: aFecha(p.hasta),
      origen: p.origen,
      motivo: p.motivo,
      cantidad: ids.length,
      movimientos: p.movimientos.map(copiaDe),
      descartadoPor: ctx.usuario?.id ?? null,
    },
    select: { id: true },
  });
  await tx.conciliacionBanco.deleteMany({ where: { movimientoId: { in: ids }, confirmada: false } });
  await tx.movimientoBancario.deleteMany({ where: { id: { in: ids } } });
  return descarte.id;
}
