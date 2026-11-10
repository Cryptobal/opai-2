import { z } from "zod";

import { adaptadorSiiDe } from "./adaptador-sii";
import { comoReglaSiProveedorSii } from "./errores-sii";
import { encolarConsultaSiPendiente } from "./trabajos-dte";
import { xmlParaEnvioSii } from "./ventas-xml";

import { defineCapability } from "../define";
import { escribirConEvento } from "../core/maestros/comun";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { PERMISO_VENTAS, ambienteDe, documentoEmitidoIdSchema } from "./ventas-comun";
import { vistaDeDocumento } from "./ventas-consulta";
import { ventaSchema } from "./vistas-venta";

export const ventasEnviarSii = defineCapability({
  id: "finanzas.ventas.enviar_sii",
  descripcion:
    "Envía al SII un documento ya firmado en estado enviado, guardando el track ID de seguimiento. Usa el adaptador configurado (simulado en pruebas).",
  permiso: PERMISO_VENTAS,
  input: z.object({ documentoId: documentoEmitidoIdSchema }),
  output: ventaSchema,
  efecto: "irreversible",
  dryRun: true,
  exigeAprobacion: () => true,
  async handler(ctx, input, { dryRun }) {
    const doc = await ctx.db.documentoEmitido.findFirst({ where: { id: input.documentoId } });
    if (!doc) throw noEncontrado("El documento");
    if (doc.estadoDte !== "enviado") throw reglaDeNegocio("Solo se envía al SII un documento en estado enviado.");
    if (doc.folio == null) throw reglaDeNegocio("El documento no tiene folio.");
    const ambiente = await ambienteDe(ctx);
    const adaptador = await adaptadorSiiDe(ctx);
    const xml = await xmlParaEnvioSii(ctx, doc, adaptador);
    if (dryRun) return vistaDeDocumento(ctx, doc.id);
    const envio = await adaptador.enviar(xml, ambiente).catch((e: unknown) => {
      throw comoReglaSiProveedorSii(e, "El documento sigue firmado y sin track ID; reintente el envío.");
    });
    let envioId = "";
    await escribirConEvento(
      ctx,
      {
        tipo: "finanzas.venta.enviada_sii",
        entidadTipo: "documento_emitido",
        payload: () => ({ trackId: envio.trackId }),
      },
      async (tx) => {
        await tx.documentoEmitido.update({
          where: { id: doc.id },
          data: { trackIdSii: envio.trackId },
        });
        const fila = await tx.dteEnvio.create({
          data: {
            tenantId: ctx.tenantId,
            documentoId: doc.id,
            trackId: envio.trackId,
            estado: "pendiente",
            proximaConsultaEn: new Date(),
          },
        });
        envioId = fila.id;
        return { id: doc.id };
      },
    );
    if (envioId) await encolarConsultaSiPendiente(ctx, envioId, new Date());
    return vistaDeDocumento(ctx, doc.id);
  },
});
