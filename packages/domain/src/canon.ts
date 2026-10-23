// JSON canónico y hashes encadenados para la bitácora (ADR-023). Usa Web Crypto (Node 22 y navegador).

/** JSON con claves ordenadas, sin `undefined`, fechas en ISO: la misma entrada da el mismo texto. */
export function jsonCanonico(valor: unknown): string {
  return JSON.stringify(ordenar(valor));
}

function ordenar(valor: unknown): unknown {
  if (valor instanceof Date) return valor.toISOString();
  if (Array.isArray(valor)) return valor.map((v) => (v === undefined ? null : ordenar(v)));
  if (valor && typeof valor === "object") {
    const salida: Record<string, unknown> = {};
    for (const clave of Object.keys(valor).sort()) {
      const v = (valor as Record<string, unknown>)[clave];
      if (v !== undefined) salida[clave] = ordenar(v);
    }
    return salida;
  }
  return valor;
}

/** Hash inicial de la cadena de cada tenant. */
export const HASH_GENESIS = "0".repeat(64);

export async function sha256Hex(texto: string | Uint8Array<ArrayBuffer>): Promise<string> {
  const datos = typeof texto === "string" ? new TextEncoder().encode(texto) : texto;
  const digest = await globalThis.crypto.subtle.digest("SHA-256", datos);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** hash_n = sha256(hash_{n-1} + "\n" + payload_canon_n). */
export function hashEncadenado(previo: string, payloadCanon: string): Promise<string> {
  return sha256Hex(`${previo}\n${payloadCanon}`);
}

export type EslabonCadena = { seq: number; payloadCanon: string; hashPrevio: string; hash: string };

/** Verifica una cadena ordenada por `seq`. Devuelve la primera secuencia rota o null. */
export async function primeraRotura(
  eslabones: readonly EslabonCadena[],
  inicial = HASH_GENESIS,
): Promise<number | null> {
  let previo = inicial;
  for (const e of eslabones) {
    if (e.hashPrevio !== previo || (await hashEncadenado(previo, e.payloadCanon)) !== e.hash) {
      return e.seq;
    }
    previo = e.hash;
  }
  return null;
}
