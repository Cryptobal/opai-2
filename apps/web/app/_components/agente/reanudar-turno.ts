/**
 * Reanudación del turno del agente (CAR-524): reutiliza la idempotencia del `turnoId` y, si hace
 * falta, el historial guardado. Sin una corrida nueva si el servidor ya terminó o sigue en curso.
 */

export type PendienteTurno = {
  turnoId: string;
  mensajeId: string;
  texto: string;
  /** Reintentos de envío tras un corte de red (máximo uno). */
  reintentosEnvio: number;
};

export type ResultadoCapacidad =
  | { ok: true; data: unknown }
  | { ok: false; error: { code: string; message: string } };

export type DecisionReanudar =
  | { accion: "aplicar"; data: unknown }
  | { accion: "esperar" }
  | { accion: "reintentar_envio" }
  | { accion: "fallar" }
  | { accion: "usar_historial" };

/** Qué hacer con la respuesta de `agente.turno.preparar` al volver a la pestaña. */
export function decidirReanudar(
  r: ResultadoCapacidad,
  pendiente: PendienteTurno,
  historialTieneTurno: boolean,
): DecisionReanudar {
  if (r.ok) return { accion: "aplicar", data: r.data };
  if (historialTieneTurno) return { accion: "usar_historial" };
  if (r.error.code === "CONFLICT") return { accion: "esperar" };
  if (pendiente.reintentosEnvio < 1) return { accion: "reintentar_envio" };
  return { accion: "fallar" };
}

/** El historial guardado ya trae este turno (mismo `turno` en usuario o agente). */
export function historialIncluyeTurno(
  historial: readonly { turno?: string | undefined }[],
  turnoId: string,
): boolean {
  return historial.some((m) => m.turno === turnoId);
}
