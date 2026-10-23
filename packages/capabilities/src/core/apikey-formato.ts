import { randomBytes } from "node:crypto";

import { sha256 } from "./comun";

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const LARGO_SECRETO = 32;

/** 32 caracteres base62 (sin "_", para que el formato se pueda separar sin ambigüedad). */
function secretoAleatorio(): string {
  const bytes = randomBytes(LARGO_SECRETO * 2);
  let out = "";
  for (const b of bytes) {
    if (b < 248) out += BASE62[b % 62];
    if (out.length === LARGO_SECRETO) break;
  }
  return out.length === LARGO_SECRETO ? out : secretoAleatorio();
}

/**
 * API key `opai_<slug>_<32 base62>`. El slug permite resolver el tenant sin consultas
 * cross-tenant; se guarda solo el hash SHA-256 y un prefijo visible.
 */
export function generarApiKey(slug: string): { secreto: string; prefijo: string; hash: string } {
  const secreto = `opai_${slug}_${secretoAleatorio()}`;
  return { secreto, prefijo: secreto.slice(0, `opai_${slug}_`.length + 4), hash: sha256(secreto) };
}

const FORMATO = /^opai_([a-z0-9]+(?:-[a-z0-9]+)*)_([0-9A-Za-z]{32})$/;

/** Slug del tenant de una key bien formada, o null. No verifica que exista. */
export function slugDeApiKey(key: string): string | null {
  return FORMATO.exec(key)?.[1] ?? null;
}

export const hashApiKey = sha256;
