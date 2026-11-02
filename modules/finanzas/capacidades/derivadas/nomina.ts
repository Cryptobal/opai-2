import type { z } from "zod";

import type { celdaSchema } from "../esquemas";

/** Nómina enlazada al flujo; pendiente del motor de sueldos. */
export async function derivadasNomina(_semana?: string): Promise<z.infer<typeof celdaSchema>[]> {
  return [];
}
