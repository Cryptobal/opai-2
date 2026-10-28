import type { Capacidad, Contexto, OpcionesEjecucion } from "./types";

export function consumoEjecucion(
  ctx: Contexto,
  c: Capacidad,
  opciones: OpcionesEjecucion,
  tenantId: string,
) {
  return {
    tenantId,
    recurso: "capacidad.ejecucion",
    unidad: "llamada",
    cantidad: 1,
    modulo: c.modulo,
    capability: c.id,
    actorTipo: ctx.actor.tipo,
    actorId: ctx.actor.id ?? null,
    viaUserId: ctx.actor.viaUserId ?? null,
    apiKeyId: ctx.actor.tipo === "agent" && !ctx.actor.interno ? ctx.actor.id : null,
    portal: ctx.portal,
    efecto: c.efecto,
    dryRun: opciones.dryRun === true,
  };
}
