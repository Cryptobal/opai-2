import { z } from "zod";

import { estadoAccesoSchema } from "./comun";

export const accesoVistaSchema = z.object({
  id: z.string(),
  membershipId: z.string(),
  userId: z.string(),
  nombre: z.string(),
  email: z.string(),
  cuentaId: z.string(),
  contactoId: z.string().nullable(),
  estado: estadoAccesoSchema,
  todasInstalaciones: z.boolean(),
  instalaciones: z.array(z.object({ id: z.string(), nombre: z.string() })),
});
export type AccesoVista = z.infer<typeof accesoVistaSchema>;

export const candidatoSchema = z.object({
  membershipId: z.string(),
  userId: z.string(),
  nombre: z.string(),
  email: z.string(),
});
