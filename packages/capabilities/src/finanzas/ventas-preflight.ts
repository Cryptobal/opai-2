import { z } from "zod";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { PERMISO_VENTAS } from "./ventas-comun";
import { itemsPreflightEmision } from "./ventas-preflight-logica";

const itemSchema = z.object({
  codigo: z.string(),
  ok: z.boolean(),
  mensaje: z.string(),
  bloqueante: z.boolean(),
});

const outputSchema = z.object({
  listo: z.boolean(),
  items: z.array(itemSchema),
});

export const ventasPreflightEmision = defineCapability({
  id: "finanzas.ventas.preflight_emision",
  descripcion:
    "Revisa si el tenant puede emitir un DTE real: certificado, CAF, resolución SII, conector SimpleAPI y datos del receptor. Lectura previa al botón Emitir.",
  permiso: PERMISO_VENTAS,
  input: z.object({
    documentoId: uuidSchema.optional(),
    cuentaId: uuidSchema.optional(),
    tipoDte: z.union([z.literal(33), z.literal(34), z.literal(56), z.literal(61)]).optional(),
  }),
  output: outputSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const items = await itemsPreflightEmision(ctx, input);
    const listo = !items.some((i) => i.bloqueante && !i.ok);
    return { listo, items };
  },
});
