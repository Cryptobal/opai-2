import type { Actor } from "./types";

/**
 * Id para las columnas de autor de tipo uuid (`creado_por_id`, `actor_id` del historial…). El agente
 * interno y las apps OAuth no tienen key: su id de actor (`agente-interno:<persona>`,
 * `oauth:<cliente>`) no es un uuid, así que guardan a la persona por la que actúan. La auditoría
 * conserva el actor real (CAR-247).
 */
export function idAutor(actor: Actor): string | null {
  if (actor.tipo === "agent" && actor.interno) return actor.viaUserId;
  return actor.id ?? null;
}
