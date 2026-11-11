import { z } from "zod";

import { adaptadorSiiDe } from "./adaptador-sii";
import { comoReglaSiProveedorSii } from "./errores-sii";
import { encolarConsultaSiPendiente } from "./trabajos-dte";
import { xmlParaEnvioSii } from "./ventas-xml";

import { defineCapability } from "../define";
import { describirDocumento } from "./ventas-aprobacion-texto";
import { escribirConEvento } from "../core/maestros/comun";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { PERMISO_VENTAS, ambienteDe, documentoEmitidoIdSchema } from "./ventas-comun";
import { vistaDeDocumento } from "./ventas-consulta";
import { ventaSchema } from "./vistas-venta";

const ESTADOS_ENVIABLES = new Set(["enviado", "anulado_nc", "anulado_nd"]);

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
  describirAprobacion: describirDocumento((d) => `enviar al SII la ${d}`),
  async handler(ctx, input, { dryRun }) {
    const doc = await ctx.db.documentoEmitido.findFirst({ where: { id: input.documentoId } });
    if (!doc) throw noEncontrado("El documento");
    // Firmado y sin track ID: también si ya lo anuló una NC o ND antes de transmitirlo (CAR-270). El SII
    // necesita recibir el original para aceptar la nota que lo referencia.
    if (!ESTADOS_ENVIABLES.has(doc.estadoDte)) throw reglaDeNegocio("Solo se envía al SII un documento firmado.");
    if (doc.trackIdSii) throw reglaDeNegocio("El documento ya se envió al SII; consulte su estado en vez de reenviarlo.");
    if (doc.folio == null) throw reglaDeNegocio("El documento no tiene folio.");
    const ambiente = await ambienteDe(ctx);
    const adaptador = await adaptadorSiiDe(ctx);
    const xml = await xmlParaEnvioSii(ctx, doc, adaptador);
    if (dryRun) return vistaDeDocumento(ctx, doc.id);
    const envio = await adaptador.enviar(xml, ambiente).catch((e: unknown) => {
      throw comoReglaSiProveedorSii(e, (err) =>
        err.incierto
          ? "El resultado es incierto: el SII pudo haberlo recibido. Consulte el estado del envío antes de reenviar."
          : "El documento sigue firmado y sin track ID; puede reintentar el envío.",
      );
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
