import { z } from "zod";

import { montoSchema, semanaSchema, seccionSchema } from "./esquemas";

export const MAX_FILAS_IMPORT = 500;

export const filaImportSchema = z.object({
  seccion: seccionSchema,
  etiqueta: z.string().trim().min(2).max(120),
  semana: semanaSchema,
  monto: montoSchema,
  nota: z.string().trim().max(500).optional(),
  vinculo: z.string().trim().max(200).optional(),
});
