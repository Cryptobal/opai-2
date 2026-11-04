/** Mensajes en lenguaje de usuario para los fallos del agente (spec agente §12). */
export function textoError(code: string, message: string): string {
  if (code === "RATE_LIMITED") return "Vas muy rápido. Espera un minuto y vuelve a intentarlo.";
  if (code === "BUDGET_EXCEEDED")
    return "Se agotó el presupuesto del agente de tu empresa. Avísale a un administrador.";
  if (code === "FORBIDDEN")
    return "No tienes acceso para hacer eso con el agente. No se hizo ningún cambio.";
  return `${message} No se hizo ningún cambio.`;
}

export const ESTADO_PLAN_TEXTO = {
  completo: "Plan ejecutado",
  rechazado: "Plan descartado",
  fallido: "Un paso falló y se detuvo el plan",
  aprobacion: "Enviado a aprobación",
  vencido: "El plan venció",
} as const;
