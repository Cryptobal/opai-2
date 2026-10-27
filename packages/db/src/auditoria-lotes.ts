import { HASH_GENESIS, hashEncadenado } from "@opai/domain";

import type { TenantTx } from "./transaccion";

/** Canon histórico por lote, con SHA-256 nativo de PG (sin depender del schema de pgcrypto). */
export async function loteAuditoria(db: TenantTx, tenantId: string, desde: number, hasta: number) {
  const filas = await db.auditEvent.findMany({
    where: { tenantId, seq: { gte: desde, lte: hasta } },
    orderBy: { seq: "asc" },
    take: 1000,
  });
  const canones = await db.$queryRaw<{ id: string; canonHistorico: string }[]>`
    SELECT id,
      jsonb_build_array(tenant_id::text, seq, actor_type, actor_id, via_user_id, capability,
        entity_type, entity_id,
        to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
        encode(sha256(convert_to(coalesce(payload::text, 'null'), 'UTF8')), 'hex'))::text
        AS "canonHistorico"
    FROM core.audit_events WHERE tenant_id = ${tenantId}::uuid AND seq >= ${desde} AND seq <= ${hasta}
    ORDER BY seq LIMIT 1000
  `;
  const porId = new Map(canones.map((fila) => [fila.id, fila.canonHistorico]));
  return filas.map((fila) => ({ ...fila, canonHistorico: porId.get(fila.id) ?? "" }));
}

/** Huella del contenido actual, incluidos payload, microsegundos y hashes; agregados <=1000 filas. */
export async function huellasAuditoria(
  db: TenantTx,
  tenantId: string,
  previo: number,
  max: number,
) {
  const lotes = await db.$queryRaw<{ prefijo: string | null; total: string }[]>`
    SELECT encode(sha256(convert_to(string_agg(huella, '' ORDER BY seq, id)
        FILTER (WHERE seq <= ${previo}), 'UTF8')), 'hex') AS prefijo,
      encode(sha256(convert_to(string_agg(huella, '' ORDER BY seq, id), 'UTF8')), 'hex') AS total
    FROM (
      SELECT seq, id, encode(sha256(convert_to((to_jsonb(e) - 'created_at' ||
        jsonb_build_object('created_at', to_char(created_at AT TIME ZONE 'UTC',
          'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')))::text, 'UTF8')), 'hex') AS huella
      FROM core.audit_events e WHERE tenant_id = ${tenantId}::uuid AND seq <= ${max}
    ) filas GROUP BY (seq - 1) / 1000 ORDER BY (seq - 1) / 1000
  `;
  let prefijo = HASH_GENESIS;
  let total = HASH_GENESIS;
  for (const lote of lotes) {
    if (lote.prefijo) prefijo = await hashEncadenado(prefijo, lote.prefijo);
    total = await hashEncadenado(total, lote.total);
  }
  return { prefijo, total };
}
