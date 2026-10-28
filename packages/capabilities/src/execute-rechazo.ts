import { RechazoSensible } from "./errores";
import type { Capacidad, Contexto } from "./types";

export async function auditarRechazoSensible(ctx: Contexto, c: Capacidad, error: unknown) {
  if (error instanceof RechazoSensible && ctx.conTenant)
    try {
      await ctx.transaccion((tx) =>
        ctx.auditoria.registrar(tx, {
          tenantId: ctx.tenantId,
          actor: ctx.actor,
          capability: "core.sueldo.rechazo_sensible",
          entityType: "capacidad",
          entityId: c.id,
          payload: {},
        }),
      );
    } catch {
      console.error("No se pudo auditar el rechazo sensible");
    }
}
