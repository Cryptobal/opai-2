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

export type HechoCanonico = {
  seq: number;
  tipo: string;
  entidadTipo?: string | null;
  entidadId?: string | null;
  payload: unknown;
};

/** Texto canónico de un eslabón: lo comparten la bitácora real y la de memoria de los tests. */
export function canonDeHecho(h: HechoCanonico, en: Date): string {
  return jsonCanonico({
    seq: h.seq,
    tipo: h.tipo,
    entidadTipo: h.entidadTipo ?? null,
    entidadId: h.entidadId ?? null,
    en: en.toISOString(),
    payload: h.payload,
  });
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

export type EventoAuditoriaCanonico = {
  tenantId: string;
  seq: number;
  actorTipo: string;
  actorId: string | null;
  viaUserId: string | null;
  capability: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: Date;
  payload: unknown;
};

/**
 * Forma canónica de un evento de `core.audit_events` (ADR-023 extendido a la auditoría). El
 * payload entra como un digest SHA-256, no crudo. Verificar exige recalcularlo desde la fila;
 * una anonimización futura requiere su propio protocolo de integridad.
 */
export async function canonDeAuditoria(e: EventoAuditoriaCanonico): Promise<string> {
  const payloadDigest = await sha256Hex(jsonCanonico(e.payload ?? null));
  return jsonCanonico({
    tenantId: e.tenantId,
    seq: e.seq,
    actorTipo: e.actorTipo,
    actorId: e.actorId,
    viaUserId: e.viaUserId,
    capability: e.capability,
    entityType: e.entityType,
    entityId: e.entityId,
    createdAt: e.createdAt.toISOString(),
    payloadDigest,
  });
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
