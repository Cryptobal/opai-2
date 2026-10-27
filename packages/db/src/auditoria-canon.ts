import { sha256Hex } from "@opai/domain";

import type { TenantTx } from "./transaccion";

/** Canon v1 del backfill SQL; conserva microsegundos y la representación jsonb de PostgreSQL. */
export async function canonHistorico(tx: TenantTx, tenantId: string, id: string): Promise<string> {
  const [fila] = await tx.$queryRaw<{ prefijo: string; payload: string }[]>`
    SELECT jsonb_build_array(tenant_id::text, seq, actor_type, actor_id, via_user_id, capability,
      entity_type, entity_id,
      to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'))::text AS prefijo,
      coalesce(payload::text, 'null') AS payload
    FROM core.audit_events WHERE tenant_id = ${tenantId}::uuid AND id = ${id}::uuid
  `;
  if (!fila) return "";
  // Solo se añade un digest hexadecimal: el resto conserva el escape y los NULL de jsonb.
  return `${fila.prefijo.slice(0, -1)}, "${await sha256Hex(fila.payload)}"]`;
}
