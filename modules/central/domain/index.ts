// Dominio puro de la Central (spec docs/2.0/modulos/central.md §6). Sin base de datos ni Next.

export const SEVERIDADES = ["critica", "alta", "media", "baja"] as const;
export type Severidad = (typeof SEVERIDADES)[number];

export const ESTADOS = [
  "nueva",
  "en_contacto",
  "escalada",
  "en_atencion",
  "resuelta",
  "falsa_alarma",
  "pospuesta",
] as const;
export type EstadoAlerta = (typeof ESTADOS)[number];

/** Estados en la cola activa (la alerta pide atención). */
export const ESTADOS_ACTIVOS: readonly EstadoAlerta[] = ["nueva", "en_contacto", "escalada", "en_atencion"];
/** Estados cerrados. */
export const ESTADOS_CERRADOS: readonly EstadoAlerta[] = ["resuelta", "falsa_alarma"];

export type Accion = "resolver" | "falsa_alarma" | "reabrir" | "posponer" | "hacerse_cargo";

/**
 * Estado al que pasa una alerta con la acción, o null si la transición no vale. Resolver se acepta
 * desde cualquier estado activo: resolver implica hacerse cargo (como en PagerDuty, que resuelve
 * sin acusar primero). Reabrir vuelve a «en atención» con el mismo historial.
 */
export function transicion(estado: EstadoAlerta, accion: Accion): EstadoAlerta | null {
  const activa = ESTADOS_ACTIVOS.includes(estado);
  switch (accion) {
    case "resolver":
      return activa ? "resuelta" : null;
    case "falsa_alarma":
      return activa || estado === "pospuesta" ? "falsa_alarma" : null;
    case "posponer":
      return activa ? "pospuesta" : null;
    case "reabrir":
      return ESTADOS_CERRADOS.includes(estado) ? "en_atencion" : null;
    case "hacerse_cargo":
      return activa && estado !== "en_atencion" ? "en_atencion" : null;
  }
}

type AlertaConPlazo = { estado: string; estadoPrevio: string | null; pospuestaHasta: Date | null };

/** Una alerta pospuesta vuelve sola a su estado anterior al vencer el plazo (R4a). */
export function estadoEfectivo(a: AlertaConPlazo, ahora: Date): EstadoAlerta {
  if (a.estado === "pospuesta" && a.pospuestaHasta && a.pospuestaHasta <= ahora)
    return (a.estadoPrevio as EstadoAlerta | null) ?? "nueva";
  return a.estado as EstadoAlerta;
}

/** Orden de la cola: más grave primero. */
export function pesoSeveridad(s: string): number {
  const i = SEVERIDADES.indexOf(s as Severidad);
  return i < 0 ? SEVERIDADES.length : i;
}

/** Plazo máximo para posponer: 24 horas (una alerta no se esconde por más de un día). */
export const POSPONER_MAX_MIN = 24 * 60;
