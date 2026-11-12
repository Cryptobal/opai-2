/**
 * Reglas de aprobación por empresa (CAR-252, ADR-107, decisión de Carlos del 12-nov-2026).
 * Versión 1: una regla es «acción + monto mínimo opcional + quién aprueba (rol o grupo)». Vale para
 * personas y agentes; basta una aprobación; dueños y administradores aprueban todo, siempre.
 */
export const ACCIONES_APROBABLES = ["emitir_dte", "enviar_cotizacion"] as const;
export type AccionAprobable = (typeof ACCIONES_APROBABLES)[number];

export const ETIQUETA_ACCION_APROBABLE: Record<AccionAprobable, string> = {
  emitir_dte: "Emitir documentos al SII",
  enviar_cotizacion: "Enviar cotizaciones o propuestas",
};

export type ReglaAprobacion = {
  id: string;
  accion: string;
  /** CLP enteros. null: toda la acción, sin importar el monto. */
  montoMinimo: number | null;
  aprobadorRol: string | null;
  aprobadorGrupoId: string | null;
  activa: boolean;
};

/**
 * La regla que aplica a una acción con su monto, o null. Con varias, gana la de monto mínimo más
 * alto que se cumpla (la más específica). Si el monto no se conoce, aplica cualquier regla de la
 * acción: ante la duda se pide aprobación.
 */
export function reglaAplicable<R extends ReglaAprobacion>(
  reglas: readonly R[],
  accion: AccionAprobable,
  monto: number | null,
): R | null {
  const candidatas = reglas.filter(
    (r) =>
      r.activa &&
      r.accion === accion &&
      (r.montoMinimo === null || monto === null || monto >= r.montoMinimo),
  );
  if (!candidatas.length) return null;
  return candidatas.reduce((a, b) => ((b.montoMinimo ?? -1) > (a.montoMinimo ?? -1) ? b : a));
}

/** Roles que aprueban todo, además de lo que diga cada regla (decisión de Carlos, 12-nov). */
export const ROLES_APRUEBAN_TODO = ["owner", "admin"] as const;

/** Si la persona es aprobadora de la regla: por su rol o por pertenecer al grupo. */
export function esAprobadorDeRegla(
  regla: Pick<ReglaAprobacion, "aprobadorRol" | "aprobadorGrupoId">,
  persona: { rol: string | null; grupos: readonly string[] },
): boolean {
  if (regla.aprobadorRol && persona.rol === regla.aprobadorRol) return true;
  return !!regla.aprobadorGrupoId && persona.grupos.includes(regla.aprobadorGrupoId);
}

/**
 * Si puede resolver una solicitud. Dueños y administradores, siempre (también lo propio, para no
 * trabar a una empresa chica). Los aprobadores de la regla, sí, pero nunca su propia solicitud.
 */
export function puedeResolver(p: {
  apruebaTodo: boolean;
  esAprobador: boolean;
  esSolicitante: boolean;
}): boolean {
  if (p.apruebaTodo) return true;
  return p.esAprobador && !p.esSolicitante;
}
