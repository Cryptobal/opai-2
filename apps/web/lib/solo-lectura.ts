import { fuentesReales } from "./fuentes";

/**
 * Rutas públicas y webhooks (CAR-188): corren con actor de sistema y módulo fijo, así que no pasan
 * por la sesión. Devuelve el módulo si la empresa lo tiene en solo lectura, para que `restriccion`
 * rechace la escritura igual que en pantalla, `/api/v1` y MCP.
 */
export async function soloLecturaDe(tenantId: string, modulo: string): Promise<string[]> {
  const estado = await fuentesReales.modulosConEstado?.(tenantId);
  return estado?.soloLectura.includes(modulo) ? [modulo] : [];
}

/** Texto para quien llega por un enlace público a un módulo en solo lectura (ADR-071, adenda 7.5). */
export const MENSAJE_SOLO_LECTURA =
  "Este módulo está en solo lectura: por ahora no se puede responder ni cambiar nada desde este enlace.";

/** Si un rechazo viene de que el módulo está en solo lectura (lo decide `restriccion`). */
export const esSoloLectura = (r: { ok: boolean; error?: { code: string; message: string } }) =>
  !r.ok && r.error?.code === "FORBIDDEN" && r.error.message.includes("solo lectura");
