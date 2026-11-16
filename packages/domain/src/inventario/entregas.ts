// Entregas de Inventario (CAR-238, ADR-116, CAR-487; referente Rippling: equipo a nombre de la persona).
// Reglas R19 a R23 de docs/2.0/modulos/inventario.md.

export type Destino = { personaId?: string | undefined; instalacionId?: string | undefined };

/** Antes de resolver la instalación vigente de la persona. */
export function errorDeDestino(d: Destino): string | null {
  if (!d.personaId && !d.instalacionId) return "Elige a quién se entrega: una persona o una instalación.";
  return null;
}

/** Tras resolver la instalación de imputación (CAR-487). */
export function errorDeDestinoResuelto(d: { personaId: string | null; instalacionId: string | null }): string | null {
  if (d.personaId && !d.instalacionId) return "La persona no tiene instalación de imputación para esta entrega.";
  if (!d.personaId && !d.instalacionId) return "Elige a quién se entrega: una persona o una instalación.";
  return null;
}

export const ESTADOS_AL_DEVOLVER = ["disponible", "en_reparacion"] as const;
export type EstadoAlDevolver = (typeof ESTADOS_AL_DEVOLVER)[number];