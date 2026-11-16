import { z } from "zod";

import { defineCapability } from "../define";
import { PERMISO_VENTAS, documentoEmitidoIdSchema } from "./ventas-comun";
import { prepararCesion } from "./ventas-cesion-prep";

const simulacionCesionSchema = z.object({
  documentoId: z.string(),
  factorRut: z.string(),
  factorNombre: z.string().nullable(),
  tasaBps: z.number().int(),
  anticipo: z.number().int(),
  merma: z.number().int(),
  saldoFactor: z.number().int(),
  netoAlCeder: z.number().int(),
});

export const ventasCesionSimular = defineCapability({
  id: "finanzas.ventas.cesion_simular",
  descripcion:
    "Simula una cesión (factoring): anticipo, merma y saldo del factor antes de enviar el AEC, con el mismo criterio que el sistema heredado de facturación.",
  permiso: PERMISO_VENTAS,
  input: z.object({
    documentoId: documentoEmitidoIdSchema,
    factorRut: z.string().trim().min(3).max(20),
    factorNombre: z.string().trim().max(120).optional(),
    tasaBps: z.number().int().min(0).max(10_000).default(250),
  }),
  output: simulacionCesionSchema,
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => [s.documentoId],
  async handler(ctx, input) {
    const { doc, calc } = await prepararCesion(ctx, input.documentoId, input.tasaBps);
    return {
      documentoId: doc.id,
      factorRut: input.factorRut,
      factorNombre: input.factorNombre ?? null,
      tasaBps: input.tasaBps,
      ...calc,
    };
  },
});
