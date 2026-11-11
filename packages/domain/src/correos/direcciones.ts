// Direcciones del historial de correos del cliente (CAR-233). Lógica pura. La dirección estable de la
// empresa vive en el mismo dominio de respuestas que los seguimientos: `t<token>@respuestas.opai.cl`
// (el seguimiento usa `s<token>`). El token es aleatorio de 128 bits, nunca derivado de un id.
import { randomBytes } from "node:crypto";

import { DOMINIO_RESPUESTAS } from "../comercial/seguimiento-token";

const TOKEN_BUZON = /^t([0-9a-f]{32})$/;
const CORREO = /^[^\s@<>()",;:]+@([a-z0-9-]+\.)+[a-z]{2,}$/;

/** Token nuevo del buzón de la empresa: «t» + 32 hex en minúscula. */
export const generarTokenBuzon = (): string => `t${randomBytes(16).toString("hex")}`;
export const direccionBuzon = (token: string, dominio = DOMINIO_RESPUESTAS): string => `${token}@${dominio}`;

/** Correo en minúscula de una dirección con o sin «Nombre <…>»; null si no parece un correo. */
export function correoDeDireccion(direccion: string): string | null {
  const m = /<([^>]+)>/.exec(direccion);
  const d = (m?.[1] ?? direccion).trim().toLowerCase();
  return CORREO.test(d) ? d : null;
}

/** Token del buzón de una dirección de nuestro dominio de respuestas, o null si no calza. */
export function tokenBuzonDeDireccion(direccion: string, dominio = DOMINIO_RESPUESTAS): string | null {
  const d = correoDeDireccion(direccion);
  if (!d?.endsWith(`@${dominio}`)) return null;
  const local = d.slice(0, d.length - dominio.length - 1);
  return TOKEN_BUZON.test(local) ? local : null;
}

/** ¿Es una dirección de OPAI (buzón o seguimiento)? Nunca cuenta como contraparte del cliente. */
export const esDireccionOpai = (direccion: string, dominio = DOMINIO_RESPUESTAS): boolean =>
  correoDeDireccion(direccion)?.endsWith(`@${dominio}`) ?? false;

export const dominioDeCorreo = (correo: string): string | null => correoDeDireccion(correo)?.split("@")[1] ?? null;

/**
 * Dominio de la empresa a partir de `sitioWeb` («https://www.cliente.cl/contacto» → «cliente.cl»). Solo
 * quita el «www.» inicial: cualquier otro subdominio se conserva tal cual (regla de subdominios no
 * decidida; ver `dominioCalza`). Null si no es un host con punto.
 */
export function dominioDeSitio(sitioWeb: string | null | undefined): string | null {
  const s = sitioWeb?.trim();
  if (!s) return null;
  let host: string;
  try {
    host = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`).hostname.toLowerCase();
  } catch {
    return null;
  }
  host = host.replace(/\.$/, "").replace(/^www\./, "");
  return /^([a-z0-9-]+\.)+[a-z]{2,}$/.test(host) ? host : null;
}

/**
 * Familias de correo personal o genérico: solo se asocian por correo exacto del contacto, nunca por
 * dominio (decisión de Carlos, CAR-233). Google, Microsoft y Yahoo con cualquier extensión de país;
 * los demás proveedores personales comunes van por nombre exacto (criterio conservador).
 */
const FAMILIAS_GENERICAS = /^(gmail|googlemail|hotmail|outlook|live|msn|yahoo|ymail|rocketmail)\.[a-z]{2,3}(\.[a-z]{2})?$/;
const GENERICOS_EXACTOS = new Set([
  "icloud.com", "me.com", "mac.com", "aol.com", "proton.me", "protonmail.com", "gmx.com", "gmx.net",
  "zoho.com", "mail.com",
]);
export const esDominioGenerico = (dominio: string): boolean =>
  FAMILIAS_GENERICAS.test(dominio) || GENERICOS_EXACTOS.has(dominio);

/**
 * ¿El dominio del correo calza con el del sitio de la cuenta? Solo igualdad exacta (tras quitar «www.»).
 * Subdominios (`ventas.cliente.cl` frente a `cliente.cl`, o al revés) NO calzan: la regla no está
 * decidida (pregunta abierta a Carlos) y lo conservador es dejar el correo «sin asignar».
 */
export const dominioCalza = (dominioCorreo: string, dominioSitio: string): boolean => dominioCorreo === dominioSitio;

/** Asunto sin prefijos de respuesta o reenvío («Re:», «RV:», «Fwd:»…), para seguir un hilo. */
export function asuntoBase(asunto: string | null | undefined): string {
  let a = (asunto ?? "").trim();
  for (let previo = ""; previo !== a; ) {
    previo = a;
    a = a.replace(/^(re|rv|fw|fwd|res|aw|tr)\s*(\[\d+\])?\s*:\s*/i, "").trim();
  }
  return a.replace(/\s+/g, " ").toLowerCase();
}
