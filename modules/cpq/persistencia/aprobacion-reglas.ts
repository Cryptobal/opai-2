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

/** Reglas N6 (Carlos, 2-nov-2026): owner autoaprueba la suya; admin la de otros; nadie más. */
export function evaluarAprobacionMargen(
  ctx: Contexto,
  solicitadaPorId: string,
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
      motivoNoDecidir: "Solo un owner o un admin puede decidir la aprobación de margen.",
    };
  }
  const actorId = usuarioReal(ctx);
  const propia = solicitadaPorId === actorId;
  if (propia) {
    if (rol !== "owner") {
      return {
        puedeDecidir: false,
        autoaprobacion: false,
        motivoNoDecidir:
          "Un admin no puede aprobar su propia cotización; pide revisión a otro admin o al owner.",
      };
    }
    return { puedeDecidir: true, autoaprobacion: true, motivoNoDecidir: null };
  }
  if (rol !== "admin") {
    return {
      puedeDecidir: false,
      autoaprobacion: false,
      motivoNoDecidir: "Solo un admin puede aprobar la cotización de otra persona.",
    };
  }
  return { puedeDecidir: true, autoaprobacion: false, motivoNoDecidir: null };
}

export function exigirDecisorAprobacionMargen(ctx: Contexto, solicitadaPorId: string) {
  if (ctx.actor.tipo === "agent") {
    throw prohibido("Un agente no puede decidir la aprobación de margen.");
  }
  const e = evaluarAprobacionMargen(ctx, solicitadaPorId);
  if (!e.puedeDecidir) {
    const msg = e.motivoNoDecidir ?? "No puedes decidir esta aprobación de margen.";
    const actorId = usuarioReal(ctx);
    if (ctx.rol === "admin" && solicitadaPorId === actorId) throw prohibido(msg);
    throw reglaDeNegocio(msg);
  }
  return e;
}
