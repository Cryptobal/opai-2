import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

import { clienteApp } from "./client";

/**
 * PIN de terreno (CAR-78 · B1). El PIN nunca se guarda: solo su hash scrypt, con el mismo formato y
 * parámetros que las contraseñas de Better Auth (`salt:hex`, N=16384, r=16, p=1, 64 bytes), el algoritmo
 * que `@opai/auth` ya usa. Un PIN tiene solo un millón de combinaciones, así que el hash no basta: lo
 * protege el bloqueo por intentos y el rate limit del ingreso (ver `terreno-ingreso.ts` en capacidades).
 */
const N = 16384;
const R = 16;
const P = 1;
const LARGO = 64;

function derivar(pin: string, sal: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      pin.normalize("NFKC"),
      sal,
      LARGO,
      { N, r: R, p: P, maxmem: 128 * N * R * 2 },
      (error, clave) => (error ? reject(error) : resolve(clave)),
    );
  });
}

export async function hashPin(pin: string): Promise<string> {
  const sal = randomBytes(16).toString("hex");
  return `${sal}:${(await derivar(pin, sal)).toString("hex")}`;
}

/** Compara en tiempo constante. Un hash mal formado se trata como PIN incorrecto. */
export async function verificarPin(pin: string, hash: string): Promise<boolean> {
  const [sal, clave] = hash.split(":");
  if (!sal || !clave || !/^[0-9a-f]+$/.test(clave)) return false;
  const esperado = Buffer.from(clave, "hex");
  const obtenido = await derivar(pin, sal);
  return esperado.length === obtenido.length && timingSafeEqual(esperado, obtenido);
}

/** Hash de un PIN que nadie conoce: el ingreso lo verifica cuando el RUT no existe, para no delatarlo por tiempo. */
export const HASH_PIN_SIN_PERSONA = `${"0".repeat(32)}:${"0".repeat(128)}`;

/**
 * Empresas y personas con credencial para un RUT canónico. Corre antes de existir empresa fijada, por
 * la función `SECURITY DEFINER` `core.credenciales_terreno_por_rut`: solo ids, ni hash ni otra columna.
 */
export async function credencialesTerrenoPorRut(
  rut: string,
): Promise<{ tenantId: string; personaId: string }[]> {
  const filas = await clienteApp().$queryRaw<{ tenant_id: string; persona_id: string }[]>`
    SELECT tenant_id, persona_id FROM "core"."credenciales_terreno_por_rut"(${rut})`;
  return filas.map((f) => ({ tenantId: f.tenant_id, personaId: f.persona_id }));
}
