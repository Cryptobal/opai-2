// Dirección de respuesta de un seguimiento: <token>@respuestas.opai.cl (R12). El token es aleatorio de
// 128 bits (nunca un id adivinable ni derivado de uno). Lógica pura.
import { randomBytes } from "node:crypto";

export const DOMINIO_RESPUESTAS = "respuestas.opai.cl";
const TOKEN = /^s([0-9a-f]{32})$/;

/** Token nuevo: «s» + 32 hex en minúscula (los buzones no distinguen mayúsculas). */
export const generarTokenRespuesta = (): string => `s${randomBytes(16).toString("hex")}`;
export const direccionRespuesta = (token: string, dominio = DOMINIO_RESPUESTAS): string => `${token}@${dominio}`;

/** ¿La dirección (con o sin «Nombre <...>») es de nuestro dominio de respuestas? */
export function esDeRespuestas(direccion: string, dominio = DOMINIO_RESPUESTAS): boolean {
  return limpiar(direccion).endsWith(`@${dominio}`);
}

/** Token de una dirección de nuestro dominio, o null si no calza (se descarta sin guardar). */
export function tokenDeDireccion(direccion: string, dominio = DOMINIO_RESPUESTAS): string | null {
  const d = limpiar(direccion);
  if (!d.endsWith(`@${dominio}`)) return null;
  const local = d.slice(0, d.length - dominio.length - 1);
  return TOKEN.test(local) ? local : null;
}

function limpiar(direccion: string): string {
  const m = /<([^>]+)>/.exec(direccion);
  return (m?.[1] ?? direccion).trim().toLowerCase();
}
