import { z } from "zod";

import {
  CODIGOS_REFERENCIA_NC,
  puedeTransicionDte,
  validarMontosVenta,
  vencimientoPago,
  type MontosDteVenta,
  type TipoDteVenta,
} from "@opai/domain";
import { adaptadorSiiDesdeEntorno } from "@opai/integrations";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { aFecha, escribirConEvento, hoy, textoOpcional } from "../core/maestros/comun";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { PLAZO_PAGO_DEFECTO, montoSchema } from "./comun";
import { vistaDeDocumento } from "./ventas-consulta";
import {
  PERMISO_VENTAS,
  ambienteDe,
  consumirFolio,
  cotizacionDe,
  cuentaDe,
  documentoEmitidoIdSchema,
  instalacionDe,
  lineaInputSchema,
  montosDesdeLineas,
  rutEmisorDe,
} from "./ventas-comun";
import { ventaSchema } from "./vistas-venta";

const tipoBorradorSchema = z.union([z.literal(33), z.literal(34)]);

function montosNotaCredito(ref: { montoNeto: number; montoExento: number; montoTotal: number }, monto: number): MontosDteVenta {
  if (ref.montoExento > 0 || ref.montoNeto === 0) {
    return { neto: 0, exento: monto, iva: 0, otros: 0, total: monto };
  }
  const neto = Math.round((monto * ref.montoNeto) / ref.montoTotal);
  const iva = monto - neto;
  return { neto, exento: 0, iva, otros: 0, total: monto };
}

export const ventasCrearBorrador = defineCapability({
  id: "finanzas.ventas.crear_borrador",
  descripcion:
    "Crea un borrador de factura electrónica (33) o exenta (34) para un cliente, con líneas de detalle y plazo de pago. Valida montos y referencias de instalación o cotización antes de guardar.",
  permiso: PERMISO_VENTAS,
  input: z.object({
    cuentaId: uuidSchema,
    instalacionId: uuidSchema.optional(),
    cotizacionId: uuidSchema.optional(),
    tipoDte: tipoBorradorSchema,
    lineas: z.array(lineaInputSchema).min(1).max(60),
    plazoPagoDias: z.number().int().min(0).max(365).default(PLAZO_PAGO_DEFECTO),
    glosa: textoOpcional(300),
  }),
  output: ventaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const cuenta = await cuentaDe(ctx, input.cuentaId);
    if (input.instalacionId) await instalacionDe(ctx, input.instalacionId, cuenta.id);
    if (input.cotizacionId) await cotizacionDe(ctx, input.cotizacionId);
    const montos = montosDesdeLineas(input.tipoDte, input.lineas);
    const error = validarMontosVenta(input.tipoDte, montos);
    if (error) throw reglaDeNegocio(error);
    const emision = hoy();
    const vencimiento = vencimientoPago(emision, input.plazoPagoDias);
    const lineasData = input.lineas.map((l, orden) => ({
      tenantId: ctx.tenantId,
      orden,
      glosa: l.glosa,
      monto: l.monto,
    }));
    if (dryRun) {
      const { vistaVenta } = await import("./vistas-venta");
      return vistaVenta(
        {
          id: "",
          cuentaId: cuenta.id,
          instalacionId: input.instalacionId ?? null,
          cotizacionId: input.cotizacionId ?? null,
          tipoDte: input.tipoDte,
          folio: null,
          fechaEmision: aFecha(emision),
          fechaVencimiento: aFecha(vencimiento),
          montoNeto: montos.neto,
          montoExento: montos.exento,
          montoIva: montos.iva,
          montoOtros: montos.otros,
          montoTotal: montos.total,
          estadoDte: "borrador",
          estadoCobro: "pendiente",
          montoCobrado: 0,
          glosa: input.glosa ?? null,
          trackIdSii: null,
          documentoReferenciaId: null,
          lineas: lineasData.map((l, i) => ({ ...l, id: `dry-${i}` })),
        },
        cuenta,
        lineasData.map((l, i) => ({ id: `dry-${i}`, orden: l.orden, glosa: l.glosa, monto: l.monto })),
      );
    }
    const creado = await escribirConEvento(
      ctx,
      { tipo: "finanzas.venta.borrador_creado", entidadTipo: "documento_emitido" },
      (tx) =>
        tx.documentoEmitido.create({
          data: {
            tenantId: ctx.tenantId,
            cuentaId: cuenta.id,
            instalacionId: input.instalacionId ?? null,
            cotizacionId: input.cotizacionId ?? null,
            tipoDte: input.tipoDte,
            fechaEmision: aFecha(emision),
            fechaVencimiento: aFecha(vencimiento),
            montoNeto: montos.neto,
            montoExento: montos.exento,
            montoIva: montos.iva,
            montoOtros: montos.otros,
            montoTotal: montos.total,
            glosa: input.glosa ?? null,
            lineas: { create: lineasData },
          },
          include: { lineas: { orderBy: { orden: "asc" } } },
        }),
    );
    return vistaDeDocumento(ctx, creado.id);
  },
});

export const ventasEmitir = defineCapability({
  id: "finanzas.ventas.emitir",
  descripcion:
    "Emite un borrador: asigna folio, firma el XML con el adaptador SII del entorno y deja el documento en estado enviado listo para el SII. Requiere folios CAF y RUT emisor configurados.",
  permiso: PERMISO_VENTAS,
  input: z.object({ documentoId: documentoEmitidoIdSchema }),
  output: ventaSchema,
  efecto: "irreversible",
  dryRun: true,
  exigeAprobacion: () => true,
  async handler(ctx, input, { dryRun }) {
    const doc = await ctx.db.documentoEmitido.findFirst({
      where: { id: input.documentoId },
      include: { lineas: { orderBy: { orden: "asc" } } },
    });
    if (!doc) throw noEncontrado("El documento");
    if (doc.estadoDte !== "borrador") throw reglaDeNegocio("Solo se emiten borradores.");
    if (doc.tipoDte !== 33 && doc.tipoDte !== 34) throw reglaDeNegocio("Tipo de DTE no emitible desde borrador.");
    const cuenta = await cuentaDe(ctx, doc.cuentaId);
    if (!cuenta.rut) throw reglaDeNegocio("El cliente debe tener RUT para emitir el DTE.");
    const tipo = doc.tipoDte as TipoDteVenta;
    const error = validarMontosVenta(tipo, {
      neto: doc.montoNeto,
      exento: doc.montoExento,
      iva: doc.montoIva,
      otros: doc.montoOtros,
      total: doc.montoTotal,
    });
    if (error) throw reglaDeNegocio(error);
    const ambiente = await ambienteDe(ctx);
    const rutEmisor = await rutEmisorDe(ctx);
    const emision = doc.fechaEmision?.toISOString().slice(0, 10) ?? hoy();
    const folio = await consumirFolio(ctx, tipo, dryRun);
    const adaptador = adaptadorSiiDesdeEntorno();
    if (!adaptador.disponible) throw reglaDeNegocio("El adaptador SII no está disponible.");
    const payload = {
      ambiente,
      tipoDte: tipo,
      folio,
      fechaEmision: emision,
      rutEmisor,
      rutReceptor: cuenta.rut,
      razonSocialReceptor: cuenta.nombre,
      montos: {
        neto: doc.montoNeto,
        exento: doc.montoExento,
        iva: doc.montoIva,
        total: doc.montoTotal,
      },
      glosa: doc.glosa ?? undefined,
    };
    const firmado = dryRun ? { xml: "<DTE/>", timbrePdf417: "DRY-RUN" } : await adaptador.firmar(payload);
    if (dryRun) {
      const { vistaVenta } = await import("./vistas-venta");
      return vistaVenta({ ...doc, folio, estadoDte: "enviado" }, cuenta, doc.lineas.map((l) => ({
        id: l.id,
        orden: l.orden,
        glosa: l.glosa,
        monto: l.monto,
      })));
    }
    await escribirConEvento(
      ctx,
      {
        tipo: "finanzas.venta.emitida",
        entidadTipo: "documento_emitido",
        payload: (r) => ({ folio: r.folio!, tipoDte: r.tipoDte }),
      },
      (tx) =>
        tx.documentoEmitido.update({
          where: { id: doc.id },
          data: {
            folio,
            fechaEmision: aFecha(emision),
            estadoDte: "enviado",
            timbrePdf417: firmado.timbrePdf417,
          },
        }),
    );
    return vistaDeDocumento(ctx, doc.id);
  },
});

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
    const adaptador = adaptadorSiiDesdeEntorno();
    const xml = `<DTE folio="${doc.folio}"/>`;
    if (dryRun) return vistaDeDocumento(ctx, doc.id);
    const envio = await adaptador.enviar(xml, ambiente);
    await escribirConEvento(
      ctx,
      {
        tipo: "finanzas.venta.enviada_sii",
        entidadTipo: "documento_emitido",
        payload: (r) => ({ trackId: r.trackIdSii ?? "" }),
      },
      (tx) =>
        tx.documentoEmitido.update({
          where: { id: doc.id },
          data: { trackIdSii: envio.trackId },
        }),
    );
    const consulta = await adaptador.consultar(envio.trackId, ambiente);
    if (consulta.estado === "aceptado" && puedeTransicionDte("enviado", "aceptado")) {
      await ctx.db.documentoEmitido.update({ where: { id: doc.id }, data: { estadoDte: "aceptado" } });
    }
    return vistaDeDocumento(ctx, doc.id);
  },
});

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
                folioRef: ref.folio,
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
