// Siembra idempotente del plan de seguimiento base de la vertical del tenant (R1, ADR-021): se copia
// una vez y desde ahí es del tenant; reactivar el módulo no lo pisa.
import { planBasePorVertical } from "@opai/domain";

import type { TenantDb } from "./for-tenant";

export type ClienteSeguimiento = Pick<TenantDb, "planSeguimiento" | "planSeguimientoVersion" | "tenant">;

export async function sembrarPlanSeguimiento(db: ClienteSeguimiento, tenantId: string) {
  if ((await db.planSeguimiento.count({ where: { tenantId } })) > 0) return;
  const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { vertical: true } });
  const base = planBasePorVertical(tenant?.vertical ?? "");
  const plan = await db.planSeguimiento.create({
    data: { tenantId, nombre: base.nombre, disparador: "cotizacion_enviada", porDefecto: true },
  });
  await db.planSeguimientoVersion.create({
    data: { tenantId, planId: plan.id, version: 1, config: JSON.parse(JSON.stringify(base.config)) },
  });
}
