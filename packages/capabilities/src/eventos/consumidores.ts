import type { Contexto } from "../types";

/** Evento tal como lo recibe un consumidor (fila del outbox). */
export type EventoPublicado = {
  id: string;
  tipo: string;
  entidadTipo: string | null;
  entidadId: string | null;
  payload: unknown;
  actorTipo: string;
  actorId: string | null;
  viaUserId: string | null;
  createdAt: Date;
};

/**
 * Consumidor de eventos (ADR-029): comunicaciones, consumos, webhooks. Los módulos se comunican por
 * eventos, nunca por imports. Debe ser idempotente: el despacho reintenta hasta lograrlo.
 */
export type Consumidor = {
  id: string;
  descripcion: string;
  /** Tipos de evento que escucha, o "*" para todos. */
  eventos: readonly string[] | "*";
  handler(ctx: Contexto, evento: EventoPublicado): Promise<void>;
};

const registro = new Map<string, Consumidor>();

export const defineConsumidor = (c: Consumidor): Consumidor => c;

export function registrarConsumidores(consumidores: readonly Consumidor[]): void {
  for (const c of consumidores) {
    if (registro.has(c.id)) throw new Error(`Consumidor duplicado: "${c.id}".`);
    registro.set(c.id, c);
  }
}

export function consumidoresDe(tipo: string): Consumidor[] {
  return [...registro.values()].filter((c) => c.eventos === "*" || c.eventos.includes(tipo));
}

export function limpiarConsumidores(): void {
  registro.clear();
}
