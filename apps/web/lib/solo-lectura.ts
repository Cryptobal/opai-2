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
