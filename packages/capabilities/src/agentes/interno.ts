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

/**
 * App externa que entra por OAuth con la cuenta de la persona (CAR-247, ADR-098): agente vía usuario,
 * sin key ni plataforma, con los permisos y el alcance efectivos de la persona en la empresa del
 * token. Como el agente interno, no tiene key: lo irreversible va a su cola de aprobaciones. Con solo
 * `mcp:leer`, todos los módulos quedan en lectura y no escribe nada.
 */
export function comoAppOAuth(
  ctx: Contexto,
  app: { clientId: string; soloLectura: boolean },
): Contexto {
  if (
    ctx.actor.tipo !== "user" ||
    !ctx.usuario ||
    ctx.actor.id !== ctx.usuario.id ||
    !ctx.conTenant
  )
    throw prohibido("Sin acceso para la app conectada.");
  const actor: Actor = {
    tipo: "agent",
    id: `oauth:${app.clientId}`,
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
    modulosSoloLectura: app.soloLectura
      ? // `core` y `platform` son siempre activos y no vienen en `modulosActivos`.
        [...new Set([...ctx.modulosSoloLectura, ...ctx.modulosActivos, "core", "platform"])]
      : ctx.modulosSoloLectura,
    autorizar: (permiso) => !permiso.startsWith("platform:") && ctx.autorizar(permiso),
    idempotencia: idempotenciaSobre(ctx.db, ctx.tenantId, actor),
    eventos: eventosEnDb(ctx.tenantId, actor),
    medidor: medidorEnDb,
  };
}
