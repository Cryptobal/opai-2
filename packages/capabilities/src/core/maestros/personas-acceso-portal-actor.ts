import { PERMISOS_CORE } from "@opai/domain";

import type { EventoPublicado } from "../../eventos/consumidores";
import type { Contexto } from "../../types";

/** Sello en el payload del evento: resultado real de ctx.autorizar(usersManage) al emitir. */
export const CLAVE_SELLO_USERS_MANAGE = "usersManageEnOrigen";

/** Solo actores usuario humano sellan; agentes y API keys nunca auto-acceso por consumidor. */
export function selloAutoAccesoEnPayload(ctx: Contexto): Record<string, boolean> {
  if (ctx.actor.tipo !== "user") return {};
  return { [CLAVE_SELLO_USERS_MANAGE]: ctx.autorizar(PERMISOS_CORE.usersManage) };
}

export function autoAccesoPermitidoPorEvento(ev: EventoPublicado): boolean {
  if (ev.actorTipo !== "user") return false;
  const p = ev.payload as Record<string, unknown> | null;
  return p?.[CLAVE_SELLO_USERS_MANAGE] === true;
}

export function motivoOmisionAutoAcceso(ev: EventoPublicado): string {
  return ev.actorTipo !== "user" ? "actor_no_usuario_humano" : "sin_users_manage";
}

/** Sin auto-acceso por falta de permiso del actor o condición de negocio (auditable en bitácora). */
export async function registrarOmisionAccesoPortal(
  ctx: Contexto,
  ev: EventoPublicado,
  motivo: string,
  extra?: Record<string, unknown>,
) {
  await ctx.transaccion((tx) =>
    ctx.bitacora.registrar(tx, {
      tipo: "core.personas.acceso_portal_omitido",
      entidadTipo: ev.entidadTipo,
      entidadId: ev.entidadId,
      payload: {
        eventoId: ev.id,
        eventoTipo: ev.tipo,
        motivo,
        actorTipo: ev.actorTipo,
        actorId: ev.actorId,
        viaUserId: ev.viaUserId,
        ...extra,
      },
    }),
  );
}