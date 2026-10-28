import { randomUUID } from "node:crypto";

import { clienteApp } from "./client";
import { notificarConsulta } from "./metricas";
import type { TenantTx } from "./transaccion";

/**
 * Auditoría global, fuera de los tenants (`core.auditoria_global`, CAR-36/CAR-41): una cadena por
 * ámbito. `plataforma` la escriben las capacidades `platform.*`; `seguridad` queda definida para el
 * registro de identidad de CAR-42 (login, contraseña, MFA), que la reutilizará con `ipCifrada`
 * (nunca la IP en claro) y `userAgent`.
 */
export type AmbitoAuditoriaGlobal = "plataforma" | "seguridad";

export type HechoGlobal = {
  actorTipo: string;
  actorId: string | null;
  viaUserId: string | null;
  /** Capacidad `platform.*` o tipo de evento de seguridad (`seguridad.login`…). */
  capability: string;
  tenantObjetivoId: string | null;
  origenTenantId: string | null;
  entityType: string | null;
  entityId: string | null;
  payload: unknown;
  /** Estado anterior y nuevo de lo que cambió (CAR-41). */
  antes?: unknown;
  despues?: unknown;
  ipCifrada?: string | null;
  userAgent?: string | null;
};

const json = (v: unknown) => (v === undefined ? null : JSON.stringify(v));

/** Append encadenado en el ámbito, dentro de la transacción del llamador si la hay. */
export async function agregarAAuditoriaGlobal(
  ambito: AmbitoAuditoriaGlobal,
  hecho: HechoGlobal,
  tx?: TenantTx,
) {
  notificarConsulta(); // $queryRaw no pasa por el hook de modelos Prisma.
  const ejecutar = (d: TenantTx) => d.$queryRaw<{ id: string; seq: number; hash: string }[]>`
    SELECT * FROM core.auditoria_global_append(
      ${randomUUID()}::uuid, ${ambito}::text, ${hecho.actorTipo}::text, ${hecho.actorId}::text,
      ${hecho.viaUserId}::text, ${hecho.capability}::text, ${hecho.tenantObjetivoId}::uuid,
      ${hecho.origenTenantId}::uuid, ${hecho.entityType}::text, ${hecho.entityId}::text,
      ${json(hecho.payload ?? null)}::jsonb, ${json(hecho.antes)}::jsonb,
      ${json(hecho.despues)}::jsonb, ${hecho.ipCifrada ?? null}::text,
      ${hecho.userAgent ?? null}::text, ${new Date().toISOString()}::timestamptz, NULL::uuid
    )`;
  const [fila] = tx ? await ejecutar(tx) : await clienteApp().$transaction((t) => ejecutar(t));
  if (!fila) throw new Error("El append de la auditoría global no devolvió su fila.");
  return fila;
}
