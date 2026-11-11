import { z } from "zod";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { PERMISO_READ } from "./comun";
import { pdfDeDocumento } from "./ventas-pdf-doc";

export const ventasPdfBorrador = defineCapability({
  id: "finanzas.ventas.preview_pdf",
  descripcion:
    "Genera la vista previa en PDF de un borrador de factura guardado, con marca «BORRADOR», sin folio ni timbre del SII y sin valor tributario. Sirve para revisar cómo quedará antes de emitir.",
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
    if (doc.estadoDte !== "borrador") {
      throw reglaDeNegocio("La vista previa es solo para borradores; este documento ya se emitió (use el PDF del documento).");
    }
    const bytes = await pdfDeDocumento(ctx, doc, { borrador: true });
    return { base64: Buffer.from(bytes).toString("base64"), mime: "application/pdf" as const };
  },
});
