import { z } from "zod";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { noEncontrado } from "../errores";
import { PERMISO_READ } from "./comun";
import { pdfDeDocumento } from "./ventas-pdf-doc";

export const ventasPdf = defineCapability({
  id: "finanzas.ventas.pdf",
  descripcion:
    "Genera el PDF de un documento emitido del libro de ventas (representación impresa con timbre PDF417 textual en PR 1).",
  permiso: PERMISO_READ,
  input: z.object({ documentoId: uuidSchema }),
  output: z.object({
    base64: z.string(),
    mime: z.literal("application/pdf"),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (_s, input) => [input.documentoId],
  async handler(ctx, input) {
    const doc = await ctx.db.documentoEmitido.findFirst({ where: { id: input.documentoId } });
    if (!doc) throw noEncontrado("El documento");
    const bytes = await pdfDeDocumento(ctx, doc);
    return { base64: Buffer.from(bytes).toString("base64"), mime: "application/pdf" as const };
  },
});
