import { prestamoSaldado } from "@opai/domain";

import type { TenantTx } from "@opai/db";

/**
 * Al cerrar un período, las cuotas de préstamo que él descontó pasan a «descontada»; al devolverlo,
 * vuelven a «pendiente» (B3). Cada préstamo se salda cuando ninguna cuota sigue pendiente y se
 * reactiva si se reabre. Un préstamo cancelado nunca cambia de estado.
 */
export async function aplicarCuotasDelPeriodo(
  tx: TenantTx,
  periodoId: string,
  descontar: boolean,
): Promise<void> {
  const novedades = await tx.nominaNovedad.findMany({
    where: { periodoId, estado: "vigente", prestamoCuotaId: { not: null } },
    select: { prestamoCuotaId: true },
  });
  const cuotaIds = novedades.map((n) => n.prestamoCuotaId).filter((id): id is string => id !== null);
  if (cuotaIds.length === 0) return;
  await tx.nominaCuota.updateMany({
    where: { id: { in: cuotaIds }, estado: descontar ? "pendiente" : "descontada" },
    data: { estado: descontar ? "descontada" : "pendiente" },
  });
  const cuotas = await tx.nominaCuota.findMany({
    where: { id: { in: cuotaIds } },
    select: { prestamoId: true },
  });
  for (const prestamoId of new Set(cuotas.map((c) => c.prestamoId))) {
    const prestamo = await tx.nominaPrestamo.findUnique({ where: { id: prestamoId } });
    if (!prestamo || prestamo.estado === "cancelado") continue;
    const plan = await tx.nominaCuota.findMany({
      where: { prestamoId },
      select: { monto: true, estado: true },
    });
    const saldado = prestamoSaldado(plan.map((c) => ({ monto: c.monto, estado: c.estado as "pendiente" | "descontada" | "condonada" })));
    const estado = saldado ? "pagado" : "activo";
    if (estado !== prestamo.estado) await tx.nominaPrestamo.update({ where: { id: prestamoId }, data: { estado } });
  }
}
