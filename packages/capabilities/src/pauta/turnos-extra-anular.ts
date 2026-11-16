import type { TenantTx } from "@opai/db";

/**
 * Al anular un reemplazo o refuerzo, su turno extra (por aprobar o aprobado) queda rechazado con el
 * motivo: ya no hay turno que pagar (BRIEF-CAR-96 §10). Va en la misma transacción que la anulación.
 */
export async function rechazarTurnosDeExcepciones(
  tx: Pick<TenantTx, "turnoExtra">,
  excepcionIds: readonly string[],
  usuarioId: string | null,
): Promise<number> {
  if (excepcionIds.length === 0) return 0;
  const r = await tx.turnoExtra.updateMany({
    where: { excepcionId: { in: [...excepcionIds] }, estado: { in: ["por_aprobar", "aprobado"] } },
    data: {
      estado: "rechazado",
      motivoResolucion: "Se anuló el reemplazo o refuerzo en la pauta.",
      resueltoPor: usuarioId,
      resueltoEn: new Date(),
    },
  });
  return r.count;
}
