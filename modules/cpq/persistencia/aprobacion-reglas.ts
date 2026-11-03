import { prohibido, reglaDeNegocio, type Contexto } from "@opai/capabilities";

import { PERMISO_APROBAR } from "../capabilities/permisos";

/** Usuario humano efectivo (viaUserId si el actor es un agente). */
export function usuarioReal(ctx: Contexto) {
  if (ctx.actor.tipo === "user") return ctx.actor.id;
  if (ctx.actor.tipo === "agent") return ctx.actor.viaUserId;
  throw reglaDeNegocio("Falta identidad del actor.");
}

export type EvaluacionAprobacionMargen = {
  puedeDecidir: boolean;
  autoaprobacion: boolean;
  motivoNoDecidir: string | null;
};

const MSG_SOLO_OWNER_ADMIN =
  "Solo un owner o un admin puede decidir la aprobación de margen.";
const MSG_ADMIN_PROPIA =
  "Un admin no puede aprobar su propia cotización; pide revisión a otro admin o al owner.";
/**
 * Reglas N6 (Carlos, 2-nov-2026): «propia» = cotización que creó el actor (`creadoPorId`).
 * Owner autoaprueba la suya; owner y admin aprueban las ajenas; admin nunca la propia.
 */
export function evaluarAprobacionMargen(
  ctx: Contexto,
  creadoPorId: string,
): EvaluacionAprobacionMargen {
  if (ctx.actor.tipo === "agent") {
    return { puedeDecidir: false, autoaprobacion: false, motivoNoDecidir: null };
  }
  if (!ctx.autorizar(PERMISO_APROBAR)) {
    return { puedeDecidir: false, autoaprobacion: false, motivoNoDecidir: null };
  }
  const rol = ctx.rol;
  if (rol !== "owner" && rol !== "admin") {
    return {
      puedeDecidir: false,
      autoaprobacion: false,
      motivoNoDecidir: MSG_SOLO_OWNER_ADMIN,
    };
  }
  const actorId = usuarioReal(ctx);
  const propia = actorId === creadoPorId;
  if (propia) {
    if (rol !== "owner") {
      return {
        puedeDecidir: false,
        autoaprobacion: false,
        motivoNoDecidir: MSG_ADMIN_PROPIA,
      };
    }
    return { puedeDecidir: true, autoaprobacion: true, motivoNoDecidir: null };
  }
  return { puedeDecidir: true, autoaprobacion: false, motivoNoDecidir: null };
}

/** Lee `creadoPorId` de la cotización en la misma transacción que decide la aprobación. */
export async function creadoPorIdDeVersion(tx: Contexto["db"], versionId: string) {
  const v = await tx.cpqVersion.findFirst({ where: { id: versionId }, select: { cotizacionId: true } });
  const c = await tx.cpqCotizacion.findFirst({
    where: { id: v!.cotizacionId },
    select: { creadoPorId: true },
  });
  return c!.creadoPorId;
}

export function exigirDecisorAprobacionMargen(ctx: Contexto, creadoPorId: string) {
  if (ctx.actor.tipo === "agent") {
    throw prohibido("Un agente no puede decidir la aprobación de margen.");
  }
  const e = evaluarAprobacionMargen(ctx, creadoPorId);
  if (!e.puedeDecidir) {
    const msg = e.motivoNoDecidir ?? "No puedes decidir esta aprobación de margen.";
    throw prohibido(msg);
  }
  return e;
}

export async function aprobacionPendiente(ctx: Contexto, versionId: string) {
  return ctx.db.cpqAprobacion.findFirst({
    where: { versionId, estado: "pendiente" },
    orderBy: { createdAt: "desc" },
  });
}
