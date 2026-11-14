// Movimiento de existencias de ropa (CAR-237, R17 y R18): cambia la existencia de una talla y deja el
// movimiento en la misma transacción. Lo usan el ingreso, el ajuste y, con CAR-238, la entrega.
import type { TenantTx } from "@opai/db";
import { LIMITES_ROPA, type MotivoMovimiento } from "@opai/domain";

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
  // Crea la fila en cero si no existe; dos primeros movimientos simultáneos no chocan.
  await tx.inventarioExistencia.createMany({ data: [{ ...clave, cantidad: 0 }], skipDuplicates: true });
  const tope = m.delta < 0 ? { gte: -m.delta } : { lte: LIMITES_ROPA.cantidadMax - m.delta };
  const r = await tx.inventarioExistencia.updateMany({
    where: { ...clave, cantidad: tope },
    data: { cantidad: { increment: m.delta } },
  });
  if (r.count !== 1) {
    throw conflicto(
      m.delta < 0
        ? `No hay suficientes unidades de la talla ${m.talla}.`
        : `La talla ${m.talla} superaría el máximo de unidades.`,
    );
  }
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
