import type { TenantDb } from "@opai/db";
import type { Contexto, EventoAuditoria } from "@opai/capabilities";

export const TENANT_DE_PRUEBA = "0192f3a0-0000-7000-8000-000000000001";

/** Contexto de ejecución falso para tests de capacidades: auditoría en memoria y permisos explícitos. */
export function contextoDePrueba(permisos: readonly string[] = [], db: TenantDb = {} as TenantDb) {
  const eventos: EventoAuditoria[] = [];
  const ctx: Contexto = {
    tenantId: TENANT_DE_PRUEBA,
    actor: { tipo: "user", id: "u-test" },
    db,
    auditoria: {
      async registrar(evento) {
        eventos.push(evento);
      },
    },
    autorizar: (permiso) => permisos.includes(permiso),
  };
  return { ctx, eventos };
}
