import type { HechoPlataforma, TenantTx } from "@opai/db";

import { listarCapacidades } from "../registry";
import type { Actor, Contexto } from "../types";

// Cola y auditoría de plataforma fuera de los tenants (CAR-36): lo `platform.*` nunca queda en la
// empresa de la key ni en la de la sesión, sino en `core.aprobaciones_plataforma` y
// `core.auditoria_plataforma`, que solo se leen con `platformRole`.

export const esDePlataforma = (capability: string) => capability.startsWith("platform.");

/** Hecho de la auditoría de plataforma: actor del contexto y empresa de origen, si la hay. */
export function hechoPlataforma(
  ctx: Pick<Contexto, "actor" | "conTenant" | "tenantId">,
  h: {
    capability: string;
    tenantObjetivoId?: string | null | undefined;
    entityType?: string | null | undefined;
    entityId?: string | null | undefined;
    payload?: unknown;
    antes?: unknown;
    despues?: unknown;
  },
  actor: Actor = ctx.actor,
): HechoPlataforma {
  return {
    actorTipo: actor.tipo,
    actorId: actor.id ?? null,
    viaUserId: actor.viaUserId ?? null,
    capability: h.capability,
    tenantObjetivoId: h.tenantObjetivoId ?? null,
    origenTenantId: ctx.conTenant ? ctx.tenantId : null,
    entityType: h.entityType ?? null,
    entityId: h.entityId ?? null,
    payload: h.payload ?? null,
    ...(h.antes !== undefined || h.despues !== undefined
      ? { antes: h.antes ?? null, despues: h.despues ?? null }
      : {}),
  };
}

/** Append a la auditoría de plataforma; sin acceso de plataforma no hay dónde auditar: falla. */
export async function auditarEnPlataforma(ctx: Contexto, hecho: HechoPlataforma, tx?: TenantTx) {
  if (!ctx.plataforma) throw new Error("Auditoría de plataforma sin acceso de plataforma.");
  await ctx.plataforma.globales.auditarPlataforma(hecho, tx);
}

/**
 * Filtro para leer la auditoría de una empresa (CAR-36): antes de esta tarea, lo `platform.*` sin
 * empresa objetivo (`set_role`, ajustes, precios) y los pedidos de aprobación de plataforma
 * quedaban en la cadena de la empresa de la key o de la sesión. Esas filas no se borran (la cadena
 * es inmutable; su copia está en la auditoría de plataforma) pero ninguna empresa las ve.
 */
export function sinPlataformaAjena() {
  const sinObjetivo = listarCapacidades()
    .filter((c) => c.modulo === "platform" && !c.tenantObjetivo)
    .map((c) => c.id);
  // En positivo y con `entityType: null` explícito: `NOT (… entity_type = 'aprobacion' …)` da NULL
  // con `entity_type` nulo y escondería también las filas legítimas de la empresa objetivo.
  return {
    AND: [
      {
        OR: [
          { NOT: { capability: { startsWith: "platform." } } },
          {
            capability: { notIn: sinObjetivo },
            OR: [{ entityType: null }, { entityType: { not: "aprobacion" } }],
          },
        ],
      },
    ],
  };
}

/** Filtro de la cola de una empresa: nunca cuenta filas `platform.*` (anteriores a CAR-36). */
export const SIN_PLATAFORMA = { NOT: { capability: { startsWith: "platform." } } } as const;
