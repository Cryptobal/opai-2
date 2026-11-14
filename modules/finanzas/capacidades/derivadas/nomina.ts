import type { Contexto } from "@opai/capabilities";
import type { z } from "zod";

import type { celdaSchema } from "../esquemas";
import { celdasRemuneraciones } from "../remuneraciones-planilla";

/** Remuneraciones proyectadas de la semana desde Nómina (CAR-344); vacío sin permiso o sin módulo de Nómina. */
export async function derivadasNomina(ctx: Contexto, semana: string): Promise<z.infer<typeof celdaSchema>[]> {
  return (await celdasRemuneraciones(ctx, [semana])).vista;
}
