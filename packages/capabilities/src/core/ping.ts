import { z } from "zod";

import { defineCapability } from "../define";

/** Verifica que el registro, la validación y el contexto funcionan de extremo a extremo. */
export const ping = defineCapability({
  id: "core.ping",
  descripcion: "Responde con el tenant y la hora del servidor.",
  permiso: null,
  input: z.object({ mensaje: z.string().max(80).optional() }),
  output: z.object({
    pong: z.literal(true),
    tenantId: z.string(),
    mensaje: z.string(),
    hora: z.string(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    return {
      pong: true as const,
      tenantId: ctx.tenantId,
      mensaje: input.mensaje ?? "pong",
      hora: new Date().toISOString(),
    };
  },
});

export const capacidadesDelNucleo = [ping];
