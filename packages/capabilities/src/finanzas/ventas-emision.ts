import { z } from "zod";

import { puedeTransicionDte, validarMontosVenta, type TipoDteVenta } from "@opai/domain";
import { adaptadorSiiDesdeEntorno } from "@opai/integrations";

import { defineCapability } from "../define";
import { aFecha, escribirConEvento, hoy } from "../core/maestros/comun";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { vistaDeDocumento } from "./ventas-consulta";
import {
  PERMISO_VENTAS,
  ambienteDe,
  consumirFolio,
  cuentaDe,
  documentoEmitidoIdSchema,
  marcarBorradorEmitido,
  rutEmisorDe,
} from "./ventas-comun";
import { ventaSchema } from "./vistas-venta";

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
    if (doc.folio != null) throw reglaDeNegocio("El borrador ya tiene folio asignado.");
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
    const adaptador = adaptadorSiiDesdeEntorno();
    if (!adaptador.disponible) throw reglaDeNegocio("El adaptador SII no está disponible.");
    if (dryRun) {
      const folio = await consumirFolio(ctx, tipo, true);
      const { vistaVenta } = await import("./vistas-venta");
      return vistaVenta({ ...doc, folio, estadoDte: "enviado" }, cuenta, doc.lineas.map((l) => ({
        id: l.id,
        orden: l.orden,
        glosa: l.glosa,
        monto: l.monto,
      })));
    }
    let folioEmitido = 0;
    await escribirConEvento(
      ctx,
      {
        tipo: "finanzas.venta.emitida",
        entidadTipo: "documento_emitido",
        payload: () => ({ folio: folioEmitido, tipoDte: doc.tipoDte }),
      },
      async (tx) => {
        folioEmitido = await consumirFolio(ctx, tipo, false, tx);
        const payload = {
          ambiente,
          tipoDte: tipo,
          folio: folioEmitido,
          fechaEmision: emision,
          rutEmisor,
          rutReceptor: cuenta.rut!,
          razonSocialReceptor: cuenta.nombre,
          montos: {
            neto: doc.montoNeto,
            exento: doc.montoExento,
            iva: doc.montoIva,
            total: doc.montoTotal,
          },
          ...(doc.glosa != null && doc.glosa !== "" ? { glosa: doc.glosa } : {}),
        };
        const firmado = await adaptador.firmar(payload);
        await marcarBorradorEmitido(tx, doc.id, {
          folio: folioEmitido,
          fechaEmision: aFecha(emision),
          timbrePdf417: firmado.timbrePdf417,
        });
        return { id: doc.id };
      },
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
        payload: () => ({ trackId: envio.trackId }),
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
