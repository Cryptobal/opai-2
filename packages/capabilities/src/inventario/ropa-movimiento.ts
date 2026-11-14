// Movimiento de existencias de ropa (CAR-237, R17 y R18): cambia la existencia de una talla y deja el
// movimiento en la misma transacción. Lo usan el ingreso, el ajuste y, con CAR-238, la entrega.
import type { TenantTx } from "@opai/db";
import type { MotivoMovimiento } from "@opai/domain";

import { conflicto } from "../errores";
import type { Contexto } from "../types";

export type Movimiento = {
  tipoId: string;
  talla: string;
  delta: number;
  motivo: MotivoMovimiento;
  nota: string | null;
};

/** Aplica un movimiento; si resta más de lo que hay, falla sin cambiar nada (R17). */
export async function aplicarMovimiento(ctx: Contexto, tx: TenantTx, m: Movimiento): Promise<number> {
  const clave = { tenantId: ctx.tenantId, tipoId: m.tipoId, talla: m.talla };
  await tx.inventarioExistencia.upsert({
    where: { tenantId_tipoId_talla: clave },
    create: { ...clave, cantidad: 0 },
    update: {},
  });
  const r = await tx.inventarioExistencia.updateMany({
    where: { ...clave, ...(m.delta < 0 ? { cantidad: { gte: -m.delta } } : {}) },
    data: { cantidad: { increment: m.delta } },
  });
  if (r.count !== 1) throw conflicto(`No hay suficientes unidades de la talla ${m.talla}.`);
  await tx.inventarioMovimiento.create({
    data: {
      ...clave,
      delta: m.delta,
      motivo: m.motivo,
      nota: m.nota,
      actorId: ctx.usuario?.id ?? null,
    },
  });
  const e = await tx.inventarioExistencia.findFirstOrThrow({ where: clave, select: { cantidad: true } });
  return e.cantidad;
}
