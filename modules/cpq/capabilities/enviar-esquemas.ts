import { z } from "zod";

import { motorOutputSchema } from "./motor-esquemas";

export const manifestEnviarSchema = z.object({
  codigo: z.string(),
  titulo: z.string(),
  negocioTitulo: z.string().nullable(),
  secciones: z.array(
    z.object({
      nombre: z.string(),
      lineas: z.array(z.object({ nombre: z.string(), tipo: z.string() })),
    }),
  ),
  calculo: motorOutputSchema,
  pdfBytes: z.number().int().describe("Tamaño del PDF generado."),
});

export const previewCorreoEnviarSchema = z.object({
  evento: z.literal("cpq.cotizacion.enviada"),
  para: z.string().nullable(),
  asunto: z.string(),
  datos: z.record(z.string(), z.unknown()),
});
