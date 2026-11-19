/** Estados de persona en reclutamiento y operación (ADR-083; CAR-674). */
export const ESTADOS_PERSONA = [
  "postulante",
  "en_evaluacion",
  "rechazado",
  "externo",
  "activo",
  "inactivo",
  "bloqueado_permanente",
] as const;

export type EstadoPersona = (typeof ESTADOS_PERSONA)[number];

export const PERSONA_ESTADO_ACTIVO: EstadoPersona = "activo";
export const PERSONA_ESTADO_INACTIVO: EstadoPersona = "inactivo";
export const PERSONA_ESTADO_POSTULANTE: EstadoPersona = "postulante";
export const PERSONA_ESTADO_EXTERNO: EstadoPersona = "externo";
export const PERSONA_ESTADO_BLOQUEADO_PERMANENTE: EstadoPersona = "bloqueado_permanente";

/** Transiciones de negocio entre estados (no incluye bloqueo permanente ni su levantamiento). */
export const TRANSICIONES_PERSONA: Record<EstadoPersona, readonly EstadoPersona[]> = {
  postulante: ["en_evaluacion", "rechazado", "externo", "activo", "inactivo"],
  en_evaluacion: ["activo", "rechazado", "externo", "inactivo"],
  rechazado: ["inactivo"],
  externo: ["activo", "inactivo"],
  activo: ["inactivo"],
  inactivo: ["activo", "externo"],
  bloqueado_permanente: [],
};

const SET = new Set<string>(ESTADOS_PERSONA);

export const esEstadoPersona = (estado: string): estado is EstadoPersona => SET.has(estado);

export function puedeTransicionarPersona(desde: string, hacia: EstadoPersona): boolean {
  if (!esEstadoPersona(desde)) return false;
  return TRANSICIONES_PERSONA[desde].includes(hacia);
}

/** Solo «activo» puede tener vínculo laboral vigente (ADR-083). */
export const personaAdmiteVinculoVigente = (estado: string) => estado === PERSONA_ESTADO_ACTIVO;

export const personaEstaContratada = (estado: string) => estado === PERSONA_ESTADO_ACTIVO;