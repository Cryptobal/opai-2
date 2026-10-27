import { prohibido } from "../errores";
import { idempotenciaSobre } from "../idempotencia";
import { eventosEnDb, medidorEnDb } from "../servicios-db";
import type { Actor, Contexto } from "../types";

/** Sesión delegada: conserva permisos y alcance efectivos; nunca usa una key sintética. */
export function comoAgenteInterno(ctx: Contexto): Contexto {
  if (
    ctx.actor.tipo !== "user" ||
    !ctx.usuario ||
    ctx.actor.id !== ctx.usuario.id ||
    !ctx.conTenant ||
    !ctx.modulosActivos.includes("agente") ||
    !ctx.autorizar("agente:usar") ||
    !ctx.portal ||
    !ctx.portalesMembresia.includes(ctx.portal)
  )
    throw prohibido("Sin acceso al agente interno.");
  const actor: Actor = {
    tipo: "agent",
    id: `agente-interno:${ctx.usuario.id}`,
    viaUserId: ctx.usuario.id,
    interno: true,
  };
  return {
    ...ctx,
    actor,
    agente: null,
    plataforma: null,
    principal: null,
    scopes: null,
    autorizar: (permiso) => !permiso.startsWith("platform:") && ctx.autorizar(permiso),
    idempotencia: idempotenciaSobre(ctx.db, ctx.tenantId, actor),
    eventos: eventosEnDb(ctx.tenantId, actor),
    // Como cualquier agente: medición síncrona/prepago, nunca diferida por la sesión.
    medidor: medidorEnDb,
  };
}
