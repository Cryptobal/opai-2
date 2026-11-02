import { z } from "zod";

import { BASES_PLANTILLA } from "../domain/documento/bloques";
import { TIPOS_BLOQUE_PROPUESTA } from "../domain/documento/propuesta-tecnica";
import { uuidSchema } from "./esquemas";

export const bloquePlantillaSchema = z.object({
  tipo: z.enum(TIPOS_BLOQUE_PROPUESTA),
  activo: z.boolean(),
  fijo: z.boolean(),
  opcional: z.boolean(),
  bibliotecaClave: z.string().nullable().optional(),
});

export const bloqueArmadorSchema = bloquePlantillaSchema.extend({
  id: z.string(),
  titulo: z.string().optional(),
  contenidoOverride: z.string().nullable().optional(),
  editadoParaCliente: z.boolean().optional(),
});

export const destinatarioSchema = z.object({
  contactoId: uuidSchema.optional(),
  email: z.string().email(),
  nombre: z.string().optional(),
});

export const basesPlantillaSchema = z.enum(BASES_PLANTILLA);
