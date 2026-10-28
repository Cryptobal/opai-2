import { randomBytes } from "node:crypto";

import { type TenantTx } from "./transaccion";
import { marcarLockAuditoria } from "./lock-auditoria";
import { notificarConsulta } from "./metricas";

export { verificarAuditoria, type VerificacionAuditoria } from "./auditoria-verificar";

export type HechoAuditoria = {
  actorTipo: string;
  actorId: string | null;
  viaUserId: string | null;
  capability: string;
  entityType: string | null;
  entityId: string | null;
  payload: unknown;
};

const colasPorTransaccion = new WeakMap<TenantTx, Promise<unknown>>();

/** Append en la MISMA transacción que el hecho; orden por tenant y por llamada dentro de la tx. */
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

async function insertarAuditoria(tx: TenantTx, tenantId: string, hecho: HechoAuditoria) {
  // UUID v7, como el default uuid(7) de Prisma que sustituye este INSERT SQL (RFC 9562).
  const bytes = randomBytes(16);
  bytes.writeUIntBE(Date.now(), 0, 6);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const h = bytes.toString("hex");
  const id = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  // VOLATILE obtiene una foto nueva DESPUÉS del lock, también si esperó otro append.
  // Una CTE con lock y SELECT en la misma foto READ COMMITTED no garantiza esa propiedad.
  notificarConsulta(); // SQL de negocio: $queryRaw no pasa por el hook de modelos Prisma.
  // Desde aquí la transacción tiene (o espera) el lock del tenant hasta su COMMIT o ROLLBACK.
  marcarLockAuditoria();
  const [fila] = await tx.$queryRaw<{ id: string; seq: number; hash: string }[]>`
    SELECT * FROM core.auditoria_append(
      ${id}::uuid, ${tenantId}::uuid, ${hecho.actorTipo}::text,
      ${hecho.actorId}::text, ${hecho.viaUserId}::text, ${hecho.capability}::text,
      ${hecho.entityType}::text, ${hecho.entityId}::text,
      ${JSON.stringify(hecho.payload ?? null)}::jsonb, ${new Date().toISOString()}::timestamptz
    )
  `;
  if (!fila) throw new Error("El append de auditoría no devolvió su fila.");
  return fila;
}
