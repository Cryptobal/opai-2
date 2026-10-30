import type { Contexto } from "@opai/capabilities";
import { noEncontrado, reglaDeNegocio } from "@opai/capabilities";

import { PERMISO_VER_TODOS } from "./permisos";

type Tipo = {
  responsableDefectoTipo: string;
  responsableDefectoRol: string | null;
  responsableDefectoUsuarioId: string | null;
};

/** Id de relleno de las vistas previas (dry_run): no existe fila, pero cumple el esquema de salida. */
export const ID_VISTA_PREVIA = "00000000-0000-0000-0000-000000000000";

/**
 * Exige que `userId` tenga una membresía ACTIVA en el tenant actual. Un usuario que existe en otra
 * empresa, está suspendido o no existe da el mismo error, para no revelar a quién conoce otra empresa.
 */
export async function exigirMiembroActivo(ctx: Contexto, userId: string, quien: string): Promise<void> {
  const miembro = await ctx.db.membership.findFirst({
    where: { tenantId: ctx.tenantId, userId, estado: "activa" },
  });
  if (!miembro) throw reglaDeNegocio(`${quien} no es miembro activo de esta empresa.`);
}

/** Resuelve el responsable por defecto del tipo: un usuario fijo o el primer miembro con el rol. */
export async function responsablePorDefecto(ctx: Contexto, tipo: Tipo): Promise<string> {
  if (tipo.responsableDefectoTipo === "usuario") {
    if (!tipo.responsableDefectoUsuarioId)
      throw reglaDeNegocio("El tipo no tiene un usuario responsable configurado.");
    await exigirMiembroActivo(ctx, tipo.responsableDefectoUsuarioId, "El responsable por defecto del tipo");
    return tipo.responsableDefectoUsuarioId;
  }
  const miembro = await ctx.db.membership.findFirst({
    where: { tenantId: ctx.tenantId, rol: tipo.responsableDefectoRol ?? "", estado: "activa" },
    orderBy: { createdAt: "asc" },
  });
  if (!miembro)
    throw reglaDeNegocio(`No hay nadie con el rol "${tipo.responsableDefectoRol}" para asignarlo.`);
  return miembro.userId;
}

/** Ticket del tenant actual, sin filtrar por alcance (lo decide `vistaDeFila`). */
export async function ticketDe(ctx: Contexto, id: string) {
  const t = await ctx.db.ticket.findFirst({ where: { id } });
  if (!t) throw noEncontrado("El ticket");
  return t;
}

/** Si el actor puede ver/operar esta fila: la creó, es su responsable, o ve todos (ADR-022). */
export async function vistaDeFila(
  ctx: Contexto,
  t: { solicitanteId: string; responsableId: string },
): Promise<boolean> {
  if (ctx.autorizar(PERMISO_VER_TODOS)) return true;
  if (!ctx.usuario) return false;
  return t.solicitanteId === ctx.usuario.id || t.responsableId === ctx.usuario.id;
}
