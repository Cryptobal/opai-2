import type { Contexto } from "../types";

export const consumoBase = (ctx: Contexto, modulo: string) => ({
  tenantId: ctx.tenantId,
  modulo,
  actorTipo: ctx.actor.tipo,
  actorId: ctx.actor.id ?? null,
  viaUserId: ctx.actor.viaUserId ?? null,
  apiKeyId: ctx.actor.tipo === "agent" && !ctx.actor.interno ? ctx.actor.id : null,
  portal: ctx.portal,
});
