import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Cifrado de secretos por tenant (ADR-027): envelope encryption con AES-256-GCM. La KEK de
 * plataforma (`OPAI_SECRETS_KEY`, 32 bytes en base64) cifra una DEK por tenant; la DEK cifra cada
 * secreto. Rotar la KEK solo recifra las DEK.
 */
export type Cifrado = { cifrado: Uint8Array; iv: Uint8Array; tag: Uint8Array };

const ALGORITMO = "aes-256-gcm";

export function cifrar(clave: Uint8Array, datos: Uint8Array): Cifrado {
  if (clave.length !== 32) throw new Error("La clave debe tener 32 bytes.");
  const iv = randomBytes(12);
  const c = createCipheriv(ALGORITMO, clave, iv);
  const cifrado = Buffer.concat([c.update(datos), c.final()]);
  return { cifrado, iv, tag: c.getAuthTag() };
}

export function descifrar(clave: Uint8Array, s: Cifrado): Buffer {
  const d = createDecipheriv(ALGORITMO, clave, s.iv);
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

/** "re_AbCd…wxyz" → "••••••••wxyz". Lo único que una capacidad devuelve de un secreto. */
export const enmascarar = (sufijo: string): string => `••••••••${sufijo}`;
export const sufijoDe = (valor: string): string => valor.slice(-4);
