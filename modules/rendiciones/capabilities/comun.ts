import { z } from "zod";

export { cursorDe, pagina } from "../../../packages/capabilities/src/core/maestros/comun";

import { uuidSchema } from "./esquemas";

/** Paginación por cursor (CAR-353), alineada con el núcleo. */
export const listaSchema = z.object({
  cursor: uuidSchema.optional().describe("Id de la última fila de la página anterior."),
  limite: z.number().int().min(1).max(100).default(50),
});