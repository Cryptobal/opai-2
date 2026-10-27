import { canonDeAuditoria, HASH_GENESIS, hashEncadenado } from "@opai/domain";

import { enTransaccion, type TenantTx } from "./transaccion";
import { canonHistorico } from "./auditoria-canon";

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
const colasPorTransaccion = new WeakMap<TenantTx, Promise<unknown>>();

export function agregarAAuditoria(
  tx: TenantTx,
  tenantId: string,
  hecho: HechoAuditoria,
): Promise<{ id: string; seq: number; hash: string }> {
  // El advisory lock es reentrante: Promise.all dentro de UNA tx también necesita serialización.
  const previa = colasPorTransaccion.get(tx) ?? Promise.resolve();
  const siguiente = previa.then(() => insertarAuditoria(tx, tenantId, hecho));
  colasPorTransaccion.set(
    tx,
    siguiente.catch(() => undefined),
  );
  return siguiente;
}

async function insertarAuditoria(
  tx: TenantTx,
  tenantId: string,
  hecho: HechoAuditoria,
): Promise<{ id: string; seq: number; hash: string }> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${tenantId}, 0))`;
  // Durante la expansión conviven inserts viejos sin cadena: DESC ordena NULL primero en PG.
  const [ultima] = await tx.$queryRaw<{ seq: number; hash: string }[]>`
    SELECT seq, hash FROM core.audit_events
    WHERE tenant_id = ${tenantId}::uuid AND seq IS NOT NULL
    ORDER BY seq DESC LIMIT 1
  `;
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
  return enTransaccion(tenantId, async (db) => {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${tenantId}, 0))`;
    const cabeza = await db.auditoriaCabeza.findUnique({ where: { tenantId } });
    let previo = HASH_GENESIS;
    let esperado = 1;
    let primeraRota: number | null = null;
    for (;;) {
      const lote = await db.auditEvent.findMany({
        where: { tenantId, seq: { gte: esperado } },
        orderBy: { seq: "asc" },
        take: 1000,
      });
      for (const e of lote) {
        const canon = e.hashCanon.startsWith("{")
          ? await canonDeAuditoria({ ...e, actorTipo: e.actorType })
          : await canonHistorico(db, tenantId, e.id);
        const roto =
          e.seq !== esperado ||
          canon !== e.hashCanon ||
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
    if (primeraRota === null && ultimoSeq < (cabeza?.ultimoSeq ?? 0)) primeraRota = esperado;
    const [sinCadena] = await db.$queryRaw<{ hay: boolean }[]>`
    SELECT EXISTS(SELECT 1 FROM core.audit_events WHERE tenant_id = ${tenantId}::uuid AND seq IS NULL) AS hay
  `;
    if (sinCadena?.hay && primeraRota === null) primeraRota = esperado;
    const ok = primeraRota === null;
    await db.auditoriaCabeza.upsert({
      where: { tenantId },
      create: { tenantId, verificadaEn: new Date(), verificacionOk: ok, ultimoSeq },
      update: {
        verificadaEn: new Date(),
        verificacionOk: ok,
        ultimoSeq: Math.max(ultimoSeq, cabeza?.ultimoSeq ?? 0),
      },
    });
    return { ok, ultimoSeq, primeraRota };
  });
}
