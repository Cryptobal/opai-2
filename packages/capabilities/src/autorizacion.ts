import type { Capacidad, Contexto, Resultado } from "./types";

const SIEMPRE_ACTIVOS = new Set(["core", "platform"]);

/** Portal desde el que opera cada tipo de principal de una API key (ADR-033). */
const PORTAL_DEL_PRINCIPAL = { usuario: "erp", cuenta: "cliente", persona: "trabajador" } as const;

/** Portales donde está disponible la capacidad: los declarados o el portal de su módulo. */
export function portalesDe(c: Capacidad): readonly string[] {
  return c.portales ?? (c.modulo === "platform" ? ["platform"] : ["erp"]);
}

type Falla = Extract<Resultado, { ok: false }>;
export const falla = (code: Falla["error"]["code"], message: string): Falla => ({
  ok: false,
  error: { code, message },
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
  if (ctx.principal && ctx.principal.tipo !== "usuario") {
    const portal = PORTAL_DEL_PRINCIPAL[ctx.principal.tipo];
    if (!portalesDe(c).includes(portal)) {
      return falla("FORBIDDEN", `La capacidad no está disponible en el portal "${portal}".`);
    }
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
