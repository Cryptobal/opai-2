import { z } from "zod";

import { generarPdfDte } from "@opai/integrations";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { PERMISO_READ } from "./comun";
import { cuentaDe, rutEmisorDe } from "./ventas-comun";

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
    if (doc.folio == null || !doc.timbrePdf417) {
      throw reglaDeNegocio("Solo hay PDF para documentos emitidos y firmados.");
    }
    const [cuenta, rutEmisor, tenant] = await Promise.all([
      cuentaDe(ctx, doc.cuentaId),
      rutEmisorDe(ctx),
      ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { nombre: true } }),
    ]);
    const bytes = generarPdfDte({
      tipoDte: doc.tipoDte,
      folio: doc.folio,
      fechaEmision: doc.fechaEmision?.toISOString().slice(0, 10) ?? "",
      emisorRazon: tenant?.nombre ?? "Emisor",
      emisorRut: rutEmisor,
      receptorRazon: cuenta.nombre,
      receptorRut: cuenta.rut ?? "66000000-0",
      neto: doc.montoNeto,
      exento: doc.montoExento,
      iva: doc.montoIva,
      total: doc.montoTotal,
      timbrePdf417: doc.timbrePdf417,
      ...(doc.glosa ? { glosa: doc.glosa } : {}),
    });
    return { base64: Buffer.from(bytes).toString("base64"), mime: "application/pdf" as const };
  },
});
