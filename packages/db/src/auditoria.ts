import { canonDeAuditoria, HASH_GENESIS, hashEncadenado } from "@opai/domain";

import { forTenant } from "./for-tenant";
import type { TenantTx } from "./transaccion";

export type HechoAuditoria = {
  actorTipo: string;
  actorId: string | null;
  viaUserId: string | null;
  capability: string;
  entityType: string | null;
  entityId: string | null;
  payload: unknown;
};

/**
 * Agrega una fila a `core.audit_events` encadenada por tenant (auditoría del 26-oct-2026, ADR-023
 * extendido): MISMA transacción que la escritura que audita. El advisory lock serializa la lectura
 * de la última `seq`/`hash` del tenant y el insert siguiente (sin TOCTOU entre escrituras
 * concurrentes del mismo tenant); se libera solo al terminar la transacción.
 */
export async function agregarAAuditoria(
  tx: TenantTx,
  tenantId: string,
  hecho: HechoAuditoria,
): Promise<{ id: string; seq: number; hash: string }> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${tenantId}, 0))`;
  const ultima = await tx.auditEvent.findFirst({
    where: { tenantId },
    orderBy: { seq: "desc" },
    select: { seq: true, hash: true },
  });
  const seq = (ultima?.seq ?? 0) + 1;
  const hashAnterior = ultima?.hash ?? HASH_GENESIS;
  const createdAt = new Date();
  const hashCanon = await canonDeAuditoria({ tenantId, seq, createdAt, ...hecho });
  const hash = await hashEncadenado(hashAnterior, hashCanon);
  const fila = await tx.auditEvent.create({
    data: {
      tenantId,
      actorType: hecho.actorTipo,
      actorId: hecho.actorId,
      viaUserId: hecho.viaUserId,
      capability: hecho.capability,
      entityType: hecho.entityType,
      entityId: hecho.entityId,
      payload: JSON.parse(JSON.stringify(hecho.payload ?? null)),
      createdAt,
      seq,
      hashAnterior,
      hash,
      hashCanon,
    },
  });
  return { id: fila.id, seq, hash };
}

export type VerificacionAuditoria = { ok: boolean; ultimoSeq: number; primeraRota: number | null };

/** Recorre por lotes la cadena de `audit_events` del tenant y registra el resultado. */
export async function verificarAuditoria(tenantId: string): Promise<VerificacionAuditoria> {
  const db = forTenant(tenantId);
  let previo = HASH_GENESIS;
  let esperado = 1;
  let primeraRota: number | null = null;
  for (;;) {
    const lote = await db.auditEvent.findMany({
      where: { seq: { gte: esperado } },
      orderBy: { seq: "asc" },
      take: 1000,
      select: { seq: true, hashAnterior: true, hash: true, hashCanon: true },
    });
    for (const e of lote) {
      const roto =
        e.seq !== esperado ||
        e.hashAnterior !== previo ||
        (await hashEncadenado(previo, e.hashCanon)) !== e.hash;
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
  await db.auditoriaCabeza.upsert({
    where: { tenantId },
    create: { tenantId, verificadaEn: new Date(), verificacionOk: ok, ultimoSeq },
    update: { verificadaEn: new Date(), verificacionOk: ok, ultimoSeq },
  });
  return { ok, ultimoSeq, primeraRota };
}
