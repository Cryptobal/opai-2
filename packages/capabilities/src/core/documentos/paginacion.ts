import { z } from "zod";

import { uuidSchema } from "../esquemas";

/** Cursor y límite de listas de documentos por keyset (CAR-353 / CAR-635). */
export const inputPaginaDocumentos = {
  cursor: uuidSchema.optional().describe("`siguiente` de la página anterior."),
  limite: z.number().int().min(1).max(200).default(50),
};