/** Preferencias de menú (`navegacion_*`): no van al feed de actividad ni a Inicio. */
export function ocultarPreferenciaNav(fila: { capability: string; payload: unknown }): boolean {
  if (fila.capability !== "core.config.set") return false;
  const entrada = (fila.payload as { input?: Record<string, unknown> } | null)?.input;
  const clave = entrada?.clave;
  return typeof clave === "string" && clave.startsWith("navegacion_");
}
