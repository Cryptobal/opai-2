// Dominio puro de Tickets (ADR-025): estados, prioridad y transiciones. Sin Next, React ni base de
// datos; cada cálculo tiene su test.

/** Estados del ticket (ADR-025, confirmados 30-oct-2026 11:46 CLT). */
export const ESTADOS_TICKET = ["abierto", "en_curso", "resuelto", "cerrado", "rechazado"] as const;
export type EstadoTicket = (typeof ESTADOS_TICKET)[number];

/** p1 (más urgente) a p4 (extracción de 1.0, rondas-y-tickets.md §2). */
export const PRIORIDADES_TICKET = ["p1", "p2", "p3", "p4"] as const;
export type PrioridadTicket = (typeof PRIORIDADES_TICKET)[number];

/** Estados desde los que el ticket sigue vivo (acepta comentarios y cambios de dueño). */
export const ESTADOS_VIVOS: readonly EstadoTicket[] = ["abierto", "en_curso", "resuelto"];

/**
 * Transiciones válidas (ADR-025): abierto → en_curso → resuelto → cerrado, más rechazado desde
 * abierto o en_curso (con motivo). Un ticket cerrado o rechazado es terminal: no se reabre, se crea
 * un ticket nuevo (hechos regulados, nunca se corrige un estado ya cerrado).
 */
const TRANSICIONES: Readonly<Record<EstadoTicket, readonly EstadoTicket[]>> = {
  abierto: ["en_curso", "resuelto", "rechazado"],
  en_curso: ["resuelto", "rechazado"],
  resuelto: ["cerrado", "en_curso"],
  cerrado: [],
  rechazado: [],
};

export function puedeTransicionar(desde: EstadoTicket, hasta: EstadoTicket): boolean {
  return TRANSICIONES[desde].includes(hasta);
}

export function esEstadoTerminal(estado: EstadoTicket): boolean {
  return estado === "cerrado" || estado === "rechazado";
}

/** Una solicitud con aprobación se resuelve aprobando (→ resuelto) o rechazando (→ rechazado). */
export function puedeAprobarse(estado: EstadoTicket): boolean {
  return estado === "abierto" || estado === "en_curso";
}
