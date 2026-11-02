import type { z } from "zod";

import type { celdaSchema } from "../esquemas";

/** Reservado para Ventas DTE PR 2 (CAR-140); hoy vacío. */
export async function derivadasDte(_semana?: string): Promise<z.infer<typeof celdaSchema>[]> {
  return [];
}
