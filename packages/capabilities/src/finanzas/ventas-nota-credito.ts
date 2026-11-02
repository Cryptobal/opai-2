import { z } from "zod";

import { CODIGOS_REFERENCIA_NC, validarMontosVenta } from "@opai/domain";

import { defineCapability } from "../define";
import { escribirConEvento } from "../core/maestros/comun";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { montoSchema } from "./comun";
import { vistaDeDocumento } from "./ventas-consulta";
import { notasCreditoPreviasDe, validarNotaCreditoEmision } from "./ventas-nc-comun";
import { persistirNotaCredito } from "./ventas-nc-escritura";
import { previewNotaCreditoDryRun } from "./ventas-nc-preview";
import {
  PERMISO_VENTAS,
  ambienteDe,
  cuentaDe,
  documentoEmitidoIdSchema,
  montosNotaCredito,
  rutEmisorDe,
} from "./ventas-comun";
import { ventaSchema } from "./vistas-venta";

const codigoNcSchema = z
  .union([z.literal(1), z.literal(2), z.literal(3)])
  .describe(`Código SII (${CODIGOS_REFERENCIA_NC.join(", ")}).`);

export const ventasEmitirNotaCredito = defineCapability({
  id: "finanzas.ventas.emitir_nota_credito",
  descripcion:
    "Emite una nota de crédito (61) referenciando una factura emitida, con CodRef 1 (anula), 2 (corrige texto) o 3 (corrige montos). Exige RUT del cliente y respeta el tope acumulado sobre el original.",
  permiso: PERMISO_VENTAS,
  input: z.object({
    documentoReferenciaId: documentoEmitidoIdSchema,
    monto: montoSchema.refine((m) => m >= 0, "El monto no puede ser negativo."),
    motivo: z.string().trim().min(3).max(300),
    codigoReferencia: codigoNcSchema.default(1),
  }),
  output: ventaSchema,
  efecto: "irreversible",
  dryRun: true,
  exigeAprobacion: () => true,
  async handler(ctx, input, { dryRun }) {
    const ref = await ctx.db.documentoEmitido.findFirst({ where: { id: input.documentoReferenciaId } });
    if (!ref) throw noEncontrado("El documento de referencia");
    if (ref.estadoDte !== "aceptado" && ref.estadoDte !== "enviado") {
      throw reglaDeNegocio("La nota de crédito solo referencia documentos emitidos.");
    }
    const folioRef = ref.folio;
    if (folioRef == null || ref.tipoDte === 61) throw reglaDeNegocio("Referencia inválida.");
    const previas = await notasCreditoPreviasDe(ctx, ref.id);
    const { monto, restante } = validarNotaCreditoEmision(ref, input.codigoReferencia, input.monto, previas);
    const montos = montosNotaCredito(ref, monto);
    const error = validarMontosVenta(61, montos);
    if (error) throw reglaDeNegocio(error);
    const cuenta = await cuentaDe(ctx, ref.cuentaId);
    const rutReceptor = cuenta.rut;
    if (!rutReceptor) throw reglaDeNegocio("El cliente debe tener RUT para emitir la nota de crédito.");
    if (dryRun) {
      return previewNotaCreditoDryRun(ctx, { ref, montos, motivo: input.motivo, monto, cuenta });
    }
    const ambiente = await ambienteDe(ctx);
    const rutEmisor = await rutEmisorDe(ctx);
    let folioEmitido = 0;
    const creado = await escribirConEvento(
      ctx,
      {
        tipo: "finanzas.venta.nota_credito_emitida",
        entidadTipo: "documento_emitido",
        payload: () => ({ folio: folioEmitido, codigoReferencia: input.codigoReferencia }),
      },
      async (tx) => {
        const { doc, folioEmitido: folio } = await persistirNotaCredito(ctx, {
          ref,
          folioRef,
          rutReceptor,
          razonSocialReceptor: cuenta.nombre,
          ambiente,
          rutEmisor,
          montos,
          motivo: input.motivo,
          codigoReferencia: input.codigoReferencia,
          montoLinea: monto,
          monto,
          restante,
        }, tx);
        folioEmitido = folio;
        return doc;
      },
    );
    return vistaDeDocumento(ctx, creado.id);
  },
});
