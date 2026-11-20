import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Canje de la app nativa (CAR-516, Brief 17b): PKCE S256 (RFC 7636) entre la vista web de la app y el
 * navegador del sistema. Lógica pura, sin Better Auth ni base, para probarla sola.
 */

/** Reto y verificador: 32 bytes en base64url, sin relleno (43 caracteres). */
const BASE64URL_43 = /^[A-Za-z0-9_-]{43}$/;

/** Vida del código de canje: lo justo para volver del navegador a la app. */
export const VIDA_CODIGO_APP_SEGUNDOS = 120;

export const esRetoValido = (valor: string): boolean => BASE64URL_43.test(valor);

/** Código de un solo uso que viaja en el enlace `cl.opai.app://canje`. */
export const nuevoCodigoApp = (): string => randomBytes(32).toString("base64url");

/** Clave del código en `core.verifications` (Better Auth guarda solo su hash). */
export const claveCodigoApp = (codigo: string): string => `app-canje:${codigo}`;

/** ¿El verificador corresponde al reto? Comparación en tiempo constante. */
export function verificadorCorresponde(verificador: string, reto: string): boolean {
  if (!esRetoValido(verificador) || !esRetoValido(reto)) return false;
  const calculado = Buffer.from(createHash("sha256").update(verificador).digest("base64url"));
  const esperado = Buffer.from(reto);
  return calculado.length === esperado.length && timingSafeEqual(calculado, esperado);
}

/** Lee el valor guardado; cualquier forma inesperada se trata como inválida. */
export function leerValorCanje(valor: string): { userId: string; reto: string } | null {
  try {
    const datos: unknown = JSON.parse(valor);
    if (typeof datos !== "object" || datos === null) return null;
    const { userId, reto } = datos as Record<string, unknown>;
    if (typeof userId !== "string" || typeof reto !== "string" || !esRetoValido(reto)) return null;
    return { userId, reto };
  } catch {
    return null;
  }
}
