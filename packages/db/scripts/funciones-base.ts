// Funciones base del puesto por vertical, SOLO para desarrollo y pruebas (seed:dev-tenant; el e2e las recibe de ahí).
// Sin ellas el selector de función de la hoja de puesto queda vacío. Idempotente y sin pisar nada:
// si una función con ese nombre ya existe en el tenant, no se toca. En producción el tenant arma su
// catálogo por core.funciones.* (no se siembra en platform.tenants.create).
import { esVertical, type Vertical } from "@opai/domain";

import type { TenantDb } from "../src/for-tenant";

const FUNCIONES_BASE: Readonly<Record<Vertical, readonly string[]>> = {
  seguridad: ["Guardia", "Supervisor", "Nochero"],
  aseo: ["Operario de aseo", "Supervisor de aseo"],
  outsourcing: ["Colaborador", "Supervisor"],
  mantenimiento: ["Técnico", "Jefe de cuadrilla"],
};

export async function sembrarFuncionesBase(
  db: Pick<TenantDb, "funcionPuesto">,
  tenantId: string,
  vertical: string,
): Promise<number> {
  // Solo lo llama seed:dev-tenant (desarrollo); VERCEL_ENV es un candado extra, no la protección.
  if (process.env["VERCEL_ENV"] === "production") throw new Error("Solo para desarrollo y pruebas.");
  const v: Vertical = esVertical(vertical) ? vertical : "seguridad";
  const r = await db.funcionPuesto.createMany({
    data: FUNCIONES_BASE[v].map((nombre, orden) => ({ tenantId, nombre, vertical: v, orden })),
    skipDuplicates: true,
  });
  return r.count;
}
