import { z } from "zod";

import { uuidSchema } from "./esquemas";

export const categoriaSchema = z.object({
  id: uuidSchema,
  clave: z.string(),
  nombre: z.string(),
  clase: z.enum(["directo", "indirecto"]),
  activa: z.boolean(),
  orden: z.number().int(),
});

export const itemSchema = z.object({
  id: uuidSchema,
  codigo: z.string(),
  nombre: z.string(),
  categoriaId: uuidSchema,
  grupo: z.string(),
  unidad: z.string(),
  modoCalculo: z.string(),
  costoUnitarioClp: z.number().int().optional(),
  recurrencia: z.enum(["mensual", "unico"]),
  visibleCliente: z.boolean(),
  porDefecto: z.boolean(),
  activo: z.boolean(),
});
