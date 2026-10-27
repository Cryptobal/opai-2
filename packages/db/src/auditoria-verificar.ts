import { canonDeAuditoria, HASH_GENESIS, hashEncadenado } from "@opai/domain";

import { enTransaccion } from "./transaccion";
import { huellasAuditoria, loteAuditoria } from "./auditoria-lotes";

export type VerificacionAuditoria = {
  ok: boolean;
  ultimoSeq: number;
  primeraRota: number | null;
  pausada?: boolean;
};

// Presupuesto integral <20 s del trabajo (45 s es el presupuesto GLOBAL del runner).
const TIMEOUT_MS = 12_000;

/** Solo el job: foto estable sin lock de append; lock breve y CAS al publicar el checkpoint. */
export async function verificarAuditoria(
  tenantId: string,
  signal?: AbortSignal,
): Promise<VerificacionAuditoria> {
  const hasta = Date.now() + TIMEOUT_MS;
  const comprobar = () => {
    signal?.throwIfAborted();
    if (Date.now() >= hasta)
      throw new Error("Excedió el presupuesto de verificación de auditoría.");
  };
  comprobar();
  const foto = await enTransaccion(
    tenantId,
    async (db) => {
      await db.$executeRaw`SET LOCAL statement_timeout = '8s'`;
      const cabeza = await db.auditoriaCabeza.findUnique({ where: { tenantId } });
      const [fase] = await db.$queryRaw<{ lista: boolean }[]>`
      SELECT attnotnull AS lista FROM pg_attribute
      WHERE attrelid = 'core.audit_events'::regclass AND attname = 'seq'
    `;
      if (!fase?.lista) return null; // Expand/contract: no emitir falsas alarmas por código viejo.
      const [limite] = await db.$queryRaw<{ max: number; sinCadena: boolean }[]>`
      SELECT coalesce(max(seq), 0)::int AS max, bool_or(seq IS NULL) AS "sinCadena"
      FROM core.audit_events WHERE tenant_id = ${tenantId}::uuid
    `;
      const max = limite?.max ?? 0;
      const anterior = cabeza?.ultimoSeq ?? 0;
      const huellas = await huellasAuditoria(db, tenantId, anterior, max);
      const incremental =
        cabeza?.verificacionOk === true &&
        max >= anterior &&
        cabeza.huellaPrefijo === huellas.prefijo &&
        cabeza.ultimoHash !== null;
      let previo = incremental ? cabeza.ultimoHash! : HASH_GENESIS;
      let esperado = incremental ? anterior + 1 : 1;
      let primeraRota: number | null = null;
      while (esperado <= max) {
        const lote = await loteAuditoria(db, tenantId, esperado, max);
        if (!lote.length) {
          primeraRota = esperado;
          break;
        }
        for (const e of lote) {
          comprobar();
          const canon = e.hashCanon?.startsWith("{")
            ? await canonDeAuditoria({ ...e, actorTipo: e.actorType })
            : e.canonHistorico;
          if (
            e.seq !== esperado ||
            canon !== e.hashCanon ||
            e.hashAnterior !== previo ||
            (await hashEncadenado(previo, e.hashCanon)) !== e.hash
          ) {
            primeraRota = esperado;
            break;
          }
          previo = e.hash;
          esperado++;
        }
        if (primeraRota !== null) break;
      }
      if (primeraRota === null && (max < anterior || limite?.sinCadena)) primeraRota = esperado;
      const resultado = { ok: primeraRota === null, ultimoSeq: esperado - 1, primeraRota };
      comprobar();
      return { cabeza, resultado, previo, huella: huellas.total };
    },
    { timeoutMs: 9_000, maxWaitMs: 1_000, aislamiento: "RepeatableRead" },
  );
  comprobar();
  if (!foto) return { ok: true, ultimoSeq: 0, primeraRota: null, pausada: true };

  return enTransaccion(
    tenantId,
    async (db) => {
      await db.$executeRaw`SET LOCAL lock_timeout = '500ms'`;
      await db.$executeRaw`SET LOCAL statement_timeout = '1s'`;
      await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${tenantId}, 0))`;
      comprobar();
      const { cabeza, resultado } = foto;
      const actual = await db.auditoriaCabeza.findUnique({ where: { tenantId } });
      // Otro verificador publicó desde nuestra foto: jamás sobrescribir su resultado/baseline.
      if ((actual?.revision ?? null) !== (cabeza?.revision ?? null))
        throw new Error("Checkpoint de auditoría cambió; reintentar el trabajo.");
      const datos = {
        verificadaEn: new Date(),
        verificacionOk: resultado.ok,
        ultimoSeq: Math.max(resultado.ultimoSeq, cabeza?.ultimoSeq ?? 0),
        ultimoHash: resultado.ok ? foto.previo : null,
        huellaPrefijo: resultado.ok ? foto.huella : null,
        revision: (cabeza?.revision ?? 0) + 1,
      };
      if (actual) {
        const cambio = await db.auditoriaCabeza.updateMany({
          where: { tenantId, revision: actual.revision },
          data: datos,
        });
        if (cambio.count !== 1)
          throw new Error("Checkpoint de auditoría cambió; reintentar el trabajo.");
      } else await db.auditoriaCabeza.create({ data: { tenantId, ...datos } });
      comprobar(); // Si se canceló durante SQL, lanzar revierte la publicación antes del COMMIT.
      return resultado;
    },
    { timeoutMs: Math.max(1, Math.min(1_000, hasta - Date.now() - 1_000)), maxWaitMs: 500 },
  );
}
