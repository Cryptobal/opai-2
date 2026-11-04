import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Cifrado de secretos por tenant (ADR-027): envelope encryption con AES-256-GCM. La KEK de
 * plataforma (`OPAI_SECRETS_KEY`, 32 bytes en base64) cifra una DEK por tenant; la DEK cifra cada
 * secreto. Rotar la KEK solo recifra las DEK.
 */
export type Cifrado = { cifrado: Uint8Array; iv: Uint8Array; tag: Uint8Array };

const ALGORITMO = "aes-256-gcm";

/**
 * `aad` (datos autenticados adicionales) liga el cifrado a su contexto, p. ej. tenant+tabla+columna:
 * un valor cifrado para un campo no se descifra si se copia a otro. Opcional: los secretos no lo usan.
 */
export function cifrar(clave: Uint8Array, datos: Uint8Array, aad?: Uint8Array): Cifrado {
  if (clave.length !== 32) throw new Error("La clave debe tener 32 bytes.");
  const iv = randomBytes(12);
  const c = createCipheriv(ALGORITMO, clave, iv);
  if (aad) c.setAAD(aad);
  const cifrado = Buffer.concat([c.update(datos), c.final()]);
  return { cifrado, iv, tag: c.getAuthTag() };
}

export function descifrar(clave: Uint8Array, s: Cifrado, aad?: Uint8Array): Buffer {
  const d = createDecipheriv(ALGORITMO, clave, s.iv);
  if (aad) d.setAAD(aad);
  d.setAuthTag(s.tag);
  return Buffer.concat([d.update(s.cifrado), d.final()]);
}

export const generarDek = (): Buffer => randomBytes(32);

/** KEK vigente y, durante una rotación, la anterior. Solo se lee en el servidor. */
export function kekDelEntorno(env: Record<string, string | undefined> = process.env) {
  const decodificar = (v: string | undefined) => {
    if (!v) return null;
    const b = Buffer.from(v, "base64");
    if (b.length !== 32) throw new Error("OPAI_SECRETS_KEY debe ser de 32 bytes en base64.");
    return b;
  };
  const actual = decodificar(env["OPAI_SECRETS_KEY"]);
  return {
    actual,
    version: Number(env["OPAI_SECRETS_KEY_VERSION"] ?? "1"),
    anterior: decodificar(env["OPAI_SECRETS_KEY_ANTERIOR"]),
  };
}

/** Secretos tipo contraseña: no se persiste sufijo ni se filtra por MCP/API. */
export function secretoOcultaSufijo(nombre: string): boolean {
  return (
    nombre === "certificado_clave" ||
    nombre === "clave" ||
    nombre === "token_sesion"
  );
}

/** "re_AbCd…wxyz" → "••••••••wxyz"; sin sufijo → "••••••••". Lo único que una capacidad devuelve de un secreto. */
export const enmascarar = (sufijo: string): string =>
  sufijo ? `••••••••${sufijo}` : "••••••••";

export const sufijoDe = (valor: string): string => valor.slice(-4);

export function sufijoParaGuardar(nombre: string, valor: string): string {
  return secretoOcultaSufijo(nombre) ? "" : sufijoDe(valor);
}
