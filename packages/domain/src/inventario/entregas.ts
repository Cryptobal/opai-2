// Entregas de Inventario (CAR-238, ADR-116; referente Rippling: el equipo queda a nombre de la persona y
// se devuelve al salir). Reglas R19 a R23 de docs/2.0/modulos/inventario.md.

export type Destino = { personaId?: string | undefined; instalacionId?: string | undefined };

/** R19: una entrega va a una persona o a una instalación, nunca a las dos ni a ninguna. */
export function errorDeDestino(d: Destino): string | null {
  const n = (d.personaId ? 1 : 0) + (d.instalacionId ? 1 : 0);
  if (n === 0) return "Elige a quién se entrega: una persona o una instalación.";
  if (n === 2) return "Una entrega va a una persona o a una instalación, no a las dos.";
  return null;
}

export const ESTADOS_AL_DEVOLVER = ["disponible", "en_reparacion"] as const;
export type EstadoAlDevolver = (typeof ESTADOS_AL_DEVOLVER)[number];
