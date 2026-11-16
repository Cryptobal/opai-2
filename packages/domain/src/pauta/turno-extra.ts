// Turnos extra (CAR-96, ADR-083): reglas puras del monto y de la resolución. Sin base de datos.

export const TIPOS_TRABAJADOR = ["propio", "externo"] as const;
export type TipoTrabajador = (typeof TIPOS_TRABAJADOR)[number];

export const ESTADOS_TURNO_EXTRA = ["por_aprobar", "aprobado", "rechazado"] as const;
export type EstadoTurnoExtra = (typeof ESTADOS_TURNO_EXTRA)[number];

/** Monto configurado: el de la instalación (`puestoId` nulo) o la excepción de un puesto. */
export type MontoConfigurado = { puestoId: string | null; montoClp: number };

/**
 * Monto sugerido de un turno extra (A6): la excepción del puesto manda sobre el monto fijo de la
 * instalación. Sin ninguno configurado devuelve null (el turno se registra con 0 y quien aprueba
 * fija el monto con motivo).
 */
export function montoSugeridoTurnoExtra(montos: readonly MontoConfigurado[], puestoId: string): number | null {
  const delPuesto = montos.find((m) => m.puestoId === puestoId);
  if (delPuesto) return delPuesto.montoClp;
  return montos.find((m) => m.puestoId === null)?.montoClp ?? null;
}

/**
 * ¿Puede esta persona resolver (aprobar o rechazar) este turno? Solo uno por aprobar y nunca quien
 * lo registró (ADR-083, punto 2). Devuelve el motivo del rechazo o null si puede.
 */
export function motivoNoResolver(t: { estado: EstadoTurnoExtra; registradoPor: string }, usuarioId: string): string | null {
  if (t.estado !== "por_aprobar") return "El turno extra ya fue resuelto.";
  if (t.registradoPor === usuarioId) return "Nadie aprueba ni rechaza un turno extra que registró.";
  return null;
}

/** Al aprobar con otro monto, el motivo es obligatorio (A6): queda en la auditoría. */
export function motivoMontoFaltante(montoSugerido: number, montoFinal: number, motivo: string | null): boolean {
  return montoFinal !== montoSugerido && !motivo?.trim();
}
