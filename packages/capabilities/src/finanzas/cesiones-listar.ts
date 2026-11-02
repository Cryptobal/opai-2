import { z } from "zod";

import { defineCapability } from "../define";
import { PERMISO_VENTAS } from "./ventas-comun";

export const ventasCesionListar = defineCapability({
  id: "finanzas.cesiones.listar",
  descripcion: "Lista operaciones de cesión del tenant con estado RPETC y montos.",
  permiso: PERMISO_VENTAS,
  input: z.object({ limite: z.number().int().min(1).max(100).default(50) }),
  output: z.object({
    items: z.array(
      z.object({
        id: z.string(),
        documentoId: z.string(),
        folio: z.number().int().nullable(),
        factorRut: z.string(),
        anticipo: z.number().int(),
        merma: z.number().int(),
        saldoFactor: z.number().int(),
        estado: z.string(),
        proveedor: z.string(),
      }),
    ),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => s.items.map((i) => i.id),
  async handler(ctx, input) {
    const filas = await ctx.db.cesion.findMany({
      take: input.limite,
      orderBy: { createdAt: "desc" },
      include: { documento: { select: { folio: true } } },
    });
    return {
      items: filas.map((c) => ({
        id: c.id,
        documentoId: c.documentoId,
        folio: c.documento.folio,
        factorRut: c.factorRut,
        anticipo: c.anticipo,
        merma: c.merma,
        saldoFactor: c.saldoFactor,
        estado: c.estado,
        proveedor: c.proveedor,
      })),
    };
  },
});
