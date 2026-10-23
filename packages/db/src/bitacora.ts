import { HASH_GENESIS, hashEncadenado, jsonCanonico } from "@opai/domain";

import { forTenant } from "./for-tenant";
import type { TenantTx } from "./transaccion";

export type HechoBitacora = {
  tipo: string;
  entidadTipo?: string | null;
  entidadId?: string | null;
  payload: unknown;
};

/**
 * Agrega un hecho a la bitácora encadenada del tenant (ADR-023) dentro de la transacción del
 * hecho. La cabeza se bloquea con FOR UPDATE: dos hechos simultáneos del mismo tenant se
 * serializan y la cadena no se bifurca. La hora es la del servidor.
 */
export async function agregarABitacora(
  tx: TenantTx,
  tenantId: string,
  hecho: HechoBitacora,
): Promise<{ seq: number; hash: string }> {
  await tx.$executeRaw`
    INSERT INTO "core"."bitacora_cabezas" (id, tenant_id, ultimo_seq, ultimo_hash, created_at, updated_at)
    VALUES (gen_random_uuid(), ${tenantId}::uuid, 0, ${HASH_GENESIS}, now(), now())
    ON CONFLICT (tenant_id) DO NOTHING`;
  const filas = await tx.$queryRaw<{ ultimo_seq: number; ultimo_hash: string }[]>`
    SELECT ultimo_seq, ultimo_hash FROM "core"."bitacora_cabezas"
    WHERE tenant_id = ${tenantId}::uuid FOR UPDATE`;
  const cabeza = filas[0];
  if (!cabeza) throw new Error("No se pudo bloquear la cabeza de la bitácora.");
  const seq = cabeza.ultimo_seq + 1;
  const payloadCanon = jsonCanonico({
    seq,
    tipo: hecho.tipo,
    entidadTipo: hecho.entidadTipo ?? null,
    entidadId: hecho.entidadId ?? null,
    en: new Date().toISOString(),
    payload: hecho.payload,
  });
  const hash = await hashEncadenado(cabeza.ultimo_hash, payloadCanon);
  await tx.bitacora.create({
    data: {
      tenantId,
      seq,
      tipo: hecho.tipo,
      entidadTipo: hecho.entidadTipo ?? null,
      entidadId: hecho.entidadId ?? null,
      payloadCanon,
      hashPrevio: cabeza.ultimo_hash,
      hash,
    },
  });
  await tx.bitacoraCabeza.update({
    where: { tenantId },
    data: { ultimoSeq: seq, ultimoHash: hash },
  });
  return { seq, hash };
}

export type VerificacionBitacora = { ok: boolean; ultimoSeq: number; primeraRota: number | null };

/** Recorre la cadena completa por lotes y registra el resultado en la cabeza. */
export async function verificarBitacora(tenantId: string): Promise<VerificacionBitacora> {
  const db = forTenant(tenantId);
  let previo = HASH_GENESIS;
  let esperado = 1;
  let primeraRota: number | null = null;
  for (;;) {
    const lote = await db.bitacora.findMany({
      where: { seq: { gte: esperado } },
      orderBy: { seq: "asc" },
      take: 1000,
      select: { seq: true, payloadCanon: true, hashPrevio: true, hash: true },
    });
    for (const e of lote) {
      const roto =
        e.seq !== esperado ||
        e.hashPrevio !== previo ||
        (await hashEncadenado(previo, e.payloadCanon)) !== e.hash;
      if (roto) {
        primeraRota = esperado;
        break;
      }
      previo = e.hash;
      esperado += 1;
    }
    if (primeraRota !== null || lote.length < 1000) break;
  }
  const ultimoSeq = esperado - 1;
  const ok = primeraRota === null;
  await db.bitacoraCabeza.updateMany({ data: { verificadaEn: new Date(), verificacionOk: ok } });
  return { ok, ultimoSeq, primeraRota };
}
