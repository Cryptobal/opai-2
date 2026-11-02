import { z } from "zod";

import {
  CODIGOS_REFERENCIA_NC,
  validarMontosVenta,
} from "@opai/domain";
import { adaptadorSiiDesdeEntorno } from "@opai/integrations";

import { defineCapability } from "../define";
import { aFecha, escribirConEvento, hoy } from "../core/maestros/comun";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { montoSchema } from "./comun";
import { vistaDeDocumento } from "./ventas-consulta";
import {
  PERMISO_VENTAS,
  ambienteDe,
  consumirFolio,
  cuentaDe,
  documentoEmitidoIdSchema,
  montosNotaCredito,
  rutEmisorDe,
} from "./ventas-comun";
import { ventaSchema } from "./vistas-venta";

export const ventasEmitirNotaCredito = defineCapability({
  id: "finanzas.ventas.emitir_nota_credito",
  descripcion:
    "Emite una nota de crédito (61) referenciando una factura emitida, por un monto y motivo indicados. Asigna folio y firma igual que una factura.",
  permiso: PERMISO_VENTAS,
  input: z.object({
    documentoReferenciaId: documentoEmitidoIdSchema,
    monto: montoSchema.refine((m) => m > 0, "El monto debe ser positivo."),
    motivo: z.string().trim().min(3).max(300),
    codigoReferencia: z
      .union([z.literal(1), z.literal(2), z.literal(3)])
      .default(1)
      .describe(`Código SII (${CODIGOS_REFERENCIA_NC.join(", ")}).`),
  }),
  output: ventaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const ref = await ctx.db.documentoEmitido.findFirst({ where: { id: input.documentoReferenciaId } });
    if (!ref) throw noEncontrado("El documento de referencia");
    if (ref.estadoDte !== "aceptado" && ref.estadoDte !== "enviado") {
      throw reglaDeNegocio("La nota de crédito solo referencia documentos emitidos.");
    }
    if (ref.folio == null || ref.tipoDte === 61) throw reglaDeNegocio("Referencia inválida.");
    if (input.monto > ref.montoTotal) throw reglaDeNegocio("El monto no puede superar el total del documento.");
    const montos = montosNotaCredito(ref, input.monto);
    const error = validarMontosVenta(61, montos);
    if (error) throw reglaDeNegocio(error);
    const cuenta = await cuentaDe(ctx, ref.cuentaId);
    const ambiente = await ambienteDe(ctx);
    const rutEmisor = await rutEmisorDe(ctx);
    const emision = hoy();
    const folio = await consumirFolio(ctx, 61, dryRun);
    const adaptador = adaptadorSiiDesdeEntorno();
    const payload = {
      ambiente,
      tipoDte: 61 as const,
      folio,
      fechaEmision: emision,
      rutEmisor,
      rutReceptor: cuenta.rut ?? "66000000-0",
      razonSocialReceptor: cuenta.nombre,
      montos: { neto: montos.neto, exento: montos.exento, iva: montos.iva, total: montos.total },
      glosa: input.motivo,
      referencias: [
        { tipoDte: ref.tipoDte, folio: ref.folio, codigo: input.codigoReferencia, razon: input.motivo },
      ],
    };
    const firmado = dryRun ? { xml: "<DTE/>", timbrePdf417: "DRY-NC" } : await adaptador.firmar(payload);
    if (dryRun) {
      const { vistaVenta } = await import("./vistas-venta");
      return vistaVenta(
        {
          id: "",
          cuentaId: ref.cuentaId,
          instalacionId: ref.instalacionId,
          cotizacionId: ref.cotizacionId,
          tipoDte: 61,
          folio,
          fechaEmision: aFecha(emision),
          fechaVencimiento: ref.fechaVencimiento,
          montoNeto: montos.neto,
          montoExento: montos.exento,
          montoIva: montos.iva,
          montoOtros: 0,
          montoTotal: montos.total,
          estadoDte: "enviado",
          estadoCobro: "pendiente",
          montoCobrado: 0,
          glosa: input.motivo,
          trackIdSii: null,
          documentoReferenciaId: ref.id,
          lineas: [{ id: "dry", orden: 0, glosa: input.motivo, monto: input.monto }],
        },
        cuenta,
        [{ id: "dry", orden: 0, glosa: input.motivo, monto: input.monto }],
      );
    }
    const creado = await escribirConEvento(
      ctx,
      { tipo: "finanzas.venta.nota_credito_emitida", entidadTipo: "documento_emitido" },
      (tx) =>
        tx.documentoEmitido.create({
          data: {
            tenantId: ctx.tenantId,
            cuentaId: ref.cuentaId,
            instalacionId: ref.instalacionId,
            cotizacionId: ref.cotizacionId,
            tipoDte: 61,
            folio,
            fechaEmision: aFecha(emision),
            fechaVencimiento: ref.fechaVencimiento,
            montoNeto: montos.neto,
            montoExento: montos.exento,
            montoIva: montos.iva,
            montoOtros: 0,
            montoTotal: montos.total,
            estadoDte: "enviado",
            glosa: input.motivo,
            timbrePdf417: firmado.timbrePdf417,
            documentoReferenciaId: ref.id,
            codigoReferencia: input.codigoReferencia,
            motivoNc: input.motivo,
            lineas: {
              create: [{ tenantId: ctx.tenantId, orden: 0, glosa: input.motivo, monto: input.monto }],
            },
            referencias: {
              create: {
                tenantId: ctx.tenantId,
                tipoDteRef: ref.tipoDte,
                folioRef: ref.folio!,
                codigoRef: input.codigoReferencia,
                razonRef: input.motivo,
              },
            },
          },
          include: { lineas: { orderBy: { orden: "asc" } } },
        }),
    );
    return vistaDeDocumento(ctx, creado.id);
  },
});
