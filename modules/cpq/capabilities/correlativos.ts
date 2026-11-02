import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { formatearCodigo } from "../domain";
import { PERMISO_MODELO } from "./permisos";

export const correlativosFijar = defineCapability({
  id: "cpq.correlativos.fijar",
  descripcion:
    "Fija el último número correlativo CPQ de un año (import R54 desde 1.0); el siguiente create usará ultimo+1.",
  permiso: PERMISO_MODELO,
  input: z.object({
    anio: z.number().int().min(2000).max(9999),
    ultimo: z.number().int().min(0).max(999_999),
  }),
  output: z.object({ anio: z.number().int(), ultimo: z.number().int(), codigoEjemplo: z.string() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const codigoEjemplo = formatearCodigo(input.anio, input.ultimo + 1);
    if (dryRun) return { anio: input.anio, ultimo: input.ultimo, codigoEjemplo };
    const fila = await ctx.db.cpqCorrelativo.upsert({
      where: { tenantId_anio: { tenantId: ctx.tenantId, anio: input.anio } },
      create: { tenantId: ctx.tenantId, anio: input.anio, ultimo: input.ultimo },
      update: { ultimo: input.ultimo },
    });
    return { anio: fila.anio, ultimo: fila.ultimo, codigoEjemplo };
  },
});
