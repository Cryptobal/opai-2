import { forTenant, type Prisma, type TenantDb } from "@opai/db";

import type { Actor, Auditoria, Contexto, EventoAuditoria } from "./types";

/** Auditoría persistida en `core.audit_events` a través del cliente acotado al tenant. */
export function auditoriaEnDb(db: TenantDb, tenantId: string): Auditoria {
  return {
    async registrar(evento: EventoAuditoria): Promise<void> {
      // JSON plano: elimina undefined, funciones y referencias circulares antes de persistir.
      const payload: Prisma.InputJsonValue = JSON.parse(JSON.stringify(evento.payload ?? null));
      await db.auditEvent.create({
        data: {
          tenantId,
          actorType: evento.actor.tipo,
          actorId: evento.actor.id ?? null,
          viaUserId: evento.actor.viaUserId ?? null,
          capability: evento.capability,
          entityType: evento.entityType ?? null,
          entityId: evento.entityId ?? null,
          payload,
        },
      });
    },
  };
}

export type ParametrosContexto = {
  tenantId: string;
  actor: Actor;
  /** Brief 00: sin autenticación real, nada tiene permiso salvo las capacidades públicas. */
  autorizar?: (permiso: string) => boolean;
};

/** Construye el contexto de ejecución desde el borde (ruta HTTP, acción de UI, MCP). */
export function crearContexto(params: ParametrosContexto): Contexto {
  const db = forTenant(params.tenantId);
  return {
    tenantId: params.tenantId,
    actor: params.actor,
    db,
    auditoria: auditoriaEnDb(db, params.tenantId),
    autorizar: params.autorizar ?? (() => false),
  };
}
