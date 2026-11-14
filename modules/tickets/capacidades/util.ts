import type { Contexto } from "@opai/capabilities";
import { noEncontrado, prohibido, reglaDeNegocio } from "@opai/capabilities";
import { esRol } from "@opai/domain";

import { ROL_PORTAL_CLIENTE } from "../domain";

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
    // Solo equipo del ERP: un contacto del cliente también es «viewer» y no puede recibir tickets.
    where: { tenantId: ctx.tenantId, rol: tipo.responsableDefectoRol ?? "", estado: "activa", portales: { has: "erp" } },
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

/**
 * La instalación existe en esta empresa, no está archivada y está en el alcance de quien crea (ADR-022): un supervisor
 * solo refiere tickets a sus instalaciones. Devuelve su id o NOT_FOUND (no revela si existe fuera del alcance).
 */
export async function instalacionVisible(ctx: Contexto, id: string): Promise<string> {
  const alcance = ctx.alcance?.instalaciones;
  if (alcance && !alcance.includes(id)) throw noEncontrado("La instalación");
  const i = await ctx.db.instalacion.findFirst({ where: { id, archivadaEn: null }, select: { id: true } });
  if (!i) throw noEncontrado("La instalación");
  return i.id;
}

/** Los roles de un tipo son roles del sistema; `rolesPermitidos` admite además la marca del Portal Cliente (CAR-519). */
export function validarRoles(permitidos: readonly string[], otros: readonly (string | null | undefined)[]): void {
  for (const r of [...permitidos.filter((p) => p !== ROL_PORTAL_CLIENTE), ...otros])
    if (r && !esRol(r)) throw reglaDeNegocio(`"${r}" no es un rol válido.`);
}

type NuevoTicket = {
  tipoId: string;
  titulo: string;
  descripcion: string;
  prioridad: string;
  responsableId: string;
  instalacionId: string | null;
};

/** Única escritura de tickets: crea el ticket abierto a nombre del usuario actual, con su evento «creado» y el aviso por outbox. */
export async function insertarTicket(ctx: Contexto, d: NuevoTicket): Promise<{ id: string }> {
  // Ningún ticket se crea solo (regla de Carlos, 30-oct-2026): siempre a nombre de una persona con sesión.
  if (!ctx.usuario) throw prohibido("Se necesita una sesión de usuario para crear un ticket.");
  const usuarioId = ctx.usuario.id;
  return ctx.transaccion(async (tx) => {
    const t = await tx.ticket.create({
      data: { tenantId: ctx.tenantId, ...d, estado: "abierto", solicitanteId: usuarioId },
    });
    await tx.ticketEvento.create({
      data: { tenantId: ctx.tenantId, ticketId: t.id, tipo: "creado", actorId: usuarioId },
    });
    await ctx.eventos.emitir(tx, {
      tipo: "tickets.ticket.creado",
      entidadTipo: "ticket",
      entidadId: t.id,
      payload: { tipoId: d.tipoId, prioridad: d.prioridad, responsableId: d.responsableId, instalacionId: d.instalacionId },
    });
    return { id: t.id };
  });
}

/** ¿El rol del ERP puede usar el tipo? La marca del Portal Cliente no cuenta: `["cliente"]` sigue abierto a todo el ERP. */
export function rolPuedeUsar(permitidos: readonly string[], rol: string | null): boolean {
  const internos = permitidos.filter((p) => p !== ROL_PORTAL_CLIENTE);
  return internos.length === 0 || (rol !== null && internos.includes(rol));
}
