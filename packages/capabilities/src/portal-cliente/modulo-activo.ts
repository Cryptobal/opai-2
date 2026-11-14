import type { Contexto } from "../types";

/**
 * ¿La empresa tiene el Portal Cliente activo? Un contexto de usuario ya trae sus módulos; el de sistema con
 * que el outbox entrega los eventos (`despacharPendientes`) llega sin `modulosActivos`, así que ahí se lee
 * de la empresa. Mismo criterio que `pautaActiva`: «activo» o «trial» (en solo lectura no se crean accesos).
 */
export async function portalClienteActivo(ctx: Contexto): Promise<boolean> {
  if (ctx.modulosActivos.includes("portal_cliente")) return true;
  const m = await ctx.db.tenantModule.findFirst({
    where: { tenantId: ctx.tenantId, moduloId: "portal_cliente", estado: { in: ["activo", "trial"] } },
    select: { id: true },
  });
  return m !== null;
}
