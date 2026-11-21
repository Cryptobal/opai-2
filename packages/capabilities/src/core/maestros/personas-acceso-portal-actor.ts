import {
  accesoDeMembresia,
  INCLUIR_ACCESO,
  PERMISOS_CORE,
  tienePermisoEfectivo,
} from "@opai/domain";

import type { EventoPublicado } from "../../eventos/consumidores";
import type { Contexto } from "../../types";

/** Usuario responsable del evento (no el ctx de sistema del despacho). */
export function usuarioIdDelEvento(ev: EventoPublicado): string | null {
  if (ev.actorTipo === "user" && ev.actorId) return ev.actorId;
  if (ev.actorTipo === "agent" && ev.viaUserId) return ev.viaUserId;
  return null;
}

export async function actorDelEventoTieneUsersManage(
  ctx: Contexto,
  ev: EventoPublicado,
): Promise<boolean> {
  const userId = usuarioIdDelEvento(ev);
  if (!userId) return false;
  const m = await ctx.db.membership.findFirst({
    where: { userId, estado: "activa" },
    include: INCLUIR_ACCESO,
  });
  if (!m) return false;
  const conAcceso = {
    ...m,
    rolesAdicionales: m.rolesAdicionales ?? [],
    gruposUsuarios: m.gruposUsuarios ?? [],
    excepciones: m.excepciones ?? [],
  };
  return tienePermisoEfectivo(accesoDeMembresia(conAcceso), PERMISOS_CORE.usersManage);
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