import { z } from "zod";

import { uuidSchema } from "../esquemas";

/** Enlace personal o solicitud en sesión del firmante (mutuamente excluyentes). */
export const inputTokenOSolicitud = z
  .object({
    token: z.string().min(10).max(200).optional(),
    solicitudId: uuidSchema.optional(),
  })
  .refine((v) => Boolean(v.token) !== Boolean(v.solicitudId), {
    message: "Indica el enlace personal o la solicitud, no ambos.",
  });