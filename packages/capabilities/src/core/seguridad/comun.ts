import { mfaEsObligatoria } from "@opai/domain";

import { prohibido } from "../../errores";
import type { Contexto } from "../../types";
import type { OrigenCambio } from "@opai/db";

/**
 * Dueño de los métodos (CAR-286): la persona con sesión o el responsable humano de una key de tipo
 * usuario. Una key de servicio, de cuenta cliente o de persona no tiene métodos propios que ver ni
 * cambiar: los de su creador no son suyos.
 */
export function duenoDeMetodos(ctx: Contexto): string {
  if (ctx.actor.tipo === "user") return ctx.actor.id;
  if (ctx.actor.tipo === "agent" && (ctx.principal?.tipo ?? "usuario") === "usuario")
    return ctx.actor.viaUserId;
  throw prohibido("Solo una persona (o una key de tipo usuario) tiene métodos de acceso propios.");
}

export function origenDe(ctx: Contexto): OrigenCambio {
  return {
    tenantId: ctx.conTenant ? ctx.tenantId : null,
    via: ctx.actor.tipo === "agent" ? "agente" : "persona",
  };
}

/** La cuenta de plataforma conserva el segundo factor obligatorio (pregunta abierta para Carlos). */
export function exigeSegundoFactor(ctx: Contexto): boolean {
  return mfaEsObligatoria(ctx.usuario?.platformRole ?? null);
}
