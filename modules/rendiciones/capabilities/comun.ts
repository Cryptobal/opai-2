import { z } from "zod";

import { uuidSchema } from "./esquemas";

/** Paginación por cursor (CAR-353), alineada con el núcleo. */
export const listaSchema = z.object({
  cursor: uuidSchema.optional().describe("Id de la última fila de la página anterior."),
  limite: z.number().int().min(1).max(100).default(50),
});

export function pagina<T extends { id: string }>(
  filas: T[],
  limite: number,
  cursor: string | undefined,
) {
  const resto = cursor && filas[0]?.id === cursor ? filas.slice(1) : filas;
  const items = resto.slice(0, limite);
  return { items, siguiente: resto.length > limite ? (items.at(-1)?.id ?? null) : null };
}

export const cursorDe = (cursor: string | undefined, limite: number) =>
  cursor ? { cursor: { id: cursor }, take: limite + 2 } : { take: limite + 1 };