import type { Capacidad, Contexto, Resultado } from "./types";

const SIEMPRE_ACTIVOS = new Set(["core", "platform"]);

/**
 * Portal desde el que opera un principal acotado a portal (ADR-033). `usuario` y `servicio` operan
 * en el ERP y no se restringen aquí (el servicio solo por sus permisos finos, Identidad de servicio).
 */
const PORTAL_DEL_PRINCIPAL: Partial<Record<string, string>> = {
  cuenta: "cliente",
  persona: "trabajador",
};

/** Portales donde está disponible la capacidad: los declarados o el portal de su módulo. */
export function portalesDe(c: Capacidad): readonly string[] {
  return c.portales ?? (c.modulo === "platform" ? ["platform"] : ["erp"]);
}

type Falla = Extract<Resultado, { ok: false }>;
export const falla = (
  code: Falla["error"]["code"],
  message: string,
  detalles?: unknown,
): Falla => ({
  ok: false,
  error: { code, message, ...(detalles === undefined ? {} : { detalles }) },
});

/** Visibilidad sin el permiso: tenant, módulo activo, scopes del agente y portal del principal. */
export function restriccion(ctx: Contexto, c: Capacidad): Falla | null {
  if (!ctx.conTenant && !c.sinTenant) {
    return falla("FORBIDDEN", "Elige una empresa antes de usar esta capacidad.");
  }
  if (!SIEMPRE_ACTIVOS.has(c.modulo) && !ctx.modulosActivos.includes(c.modulo)) {
    return falla("FORBIDDEN", `Módulo inactivo: "${c.modulo}".`);
  }
  // Agentes: el módulo debe estar en los scopes. "*" cubre todo salvo plataforma.
  if (ctx.scopes && !ctx.scopes.includes(c.modulo)) {
    if (!ctx.scopes.includes("*") || c.modulo === "platform") {
      return falla("FORBIDDEN", `La API key no tiene el scope "${c.modulo}".`);
    }
  }
  // Gobierno de agentes (ADR-032): aprobar, rechazar y dar autonomía o presupuesto son de personas.
  if (c.soloPersonas && ctx.actor.tipo === "agent") {
    return falla("FORBIDDEN", "Solo una persona puede hacer esto, no una API key.");
  }
  // Sesiones: fail-closed. Plataforma conserva su autorización por platformRole.
  // Única excepción (t500u, encargo portal-sesión): aceptar la invitación crea la membresía;
  // su handler exige usuario autenticado, token y correo. No exime a otras internas.
  if (
    (ctx.actor.tipo === "user" || (ctx.actor.tipo === "agent" && ctx.actor.interno)) &&
    !ctx.principal &&
    ctx.conTenant &&
    c.modulo !== "platform" &&
    c.id !== "core.invitations.accept"
  ) {
    if (!ctx.portal || !ctx.portalesMembresia.includes(ctx.portal)) {
      return falla("FORBIDDEN", "No tienes acceso a este portal.");
    }
    if (!portalesDe(c).includes(ctx.portal)) {
      return falla("FORBIDDEN", `La capacidad no está disponible en el portal "${ctx.portal}".`);
    }
  }
  const portal = ctx.principal ? PORTAL_DEL_PRINCIPAL[ctx.principal.tipo] : undefined;
  if (portal && !portalesDe(c).includes(portal)) {
    return falla("FORBIDDEN", `La capacidad no está disponible en el portal "${portal}".`);
  }
  return null;
}

/** Reglas previas al handler: restricciones y permiso. */
export function denegar(ctx: Contexto, c: Capacidad): Falla | null {
  const r = restriccion(ctx, c);
  if (r) return r;
  if (c.permiso === null) {
    const sistemaEnProduccion =
      ctx.actor.tipo === "system" && process.env.NODE_ENV === "production";
    return sistemaEnProduccion && !c.interna ? falla("UNAUTHENTICATED", "Requiere sesión.") : null;
  }
  return ctx.autorizar(c.permiso) ? null : falla("FORBIDDEN", "Sin permiso para esta capacidad.");
}
