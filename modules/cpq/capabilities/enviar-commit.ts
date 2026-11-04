import type { Contexto } from "@opai/capabilities";
import { enviarCorreo } from "@opai/capabilities";

import { datosCorreoCliente, EVENTO_CORREO_CLIENTE } from "../persistencia/correo-cliente";
import { moverNegocioPropuestaEnviada } from "../persistencia/enviar-negocio";
import {
  eliminarPdfPropuestaAlmacenamiento,
  registrarPdfPropuestaMetadatos,
  subirPdfPropuestaAlmacenamiento,
} from "../persistencia/registrar-pdf-propuesta";
import type { ResultadoCalculo } from "../domain/motor";

type PackEnviar = {
  cotizacionId: string;
  codigo: string;
  negocioId: string;
  versionId: string;
  versionNumero: number;
  contactoId: string | null;
  /** Si false, no envía correo aquí (p. ej. envío conjunto con varios destinatarios). */
  enviarCorreo?: boolean;
  pdf: Uint8Array;
  pdfPack: { marcaVersion: number; plantillaId: string; plantillaVersion: number };
  resultado: ResultadoCalculo;
  neg: {
    id: string;
    etapaId: string;
    estado: string;
    createdAt: Date;
    embudoId: string;
  };
  correoPreview: { para: string | null; datos: Record<string, unknown> };
};

export async function commitEnviarCotizacion(ctx: Contexto, pack: PackEnviar) {
  const ahora = new Date();
  const congelado = JSON.stringify(pack.resultado);
  const subido = await subirPdfPropuestaAlmacenamiento(ctx, {
    codigo: pack.codigo,
    pdf: pack.pdf,
  });
  let documentoId = "";
  try {
    await ctx.transaccion(async (tx) => {
      documentoId = await registrarPdfPropuestaMetadatos(ctx, tx, {
        ...subido,
        cotizacionId: pack.cotizacionId,
        codigo: pack.codigo,
      });
      await tx.cpqVersion.update({
        where: { id: pack.versionId },
        data: {
          estado: "enviada",
          enviadaEn: ahora,
          ventaMensualClp: pack.resultado.ventaMensual,
          calculoCongeladoJson: congelado,
          marcaDocumentoVersion: pack.pdfPack.marcaVersion,
          plantillaDocumentoId: pack.pdfPack.plantillaId,
          plantillaDocumentoVersion: pack.pdfPack.plantillaVersion,
        },
      });
      if (pack.resultado.ventaMensual != null) {
        await tx.negocio.update({
          where: { id: pack.negocioId },
          data: { valorMensual: pack.resultado.ventaMensual, cotizacionEnviadaEn: ahora },
        });
      }
      await moverNegocioPropuestaEnviada(ctx, tx, pack.neg, ahora);
      await ctx.eventos.emitir(tx, {
        tipo: "cpq.cotizacion.enviada",
        entidadTipo: "cotizacion",
        entidadId: pack.cotizacionId,
        payload: {
          codigo: pack.codigo,
          version: pack.versionNumero,
          ventaMensual: pack.resultado.ventaMensual,
          contactoId: pack.contactoId,
          documentoId,
        },
      });
    });
  } catch (e) {
    await eliminarPdfPropuestaAlmacenamiento(ctx, subido.storageKey);
    throw e;
  }
  const para = pack.correoPreview.para;
  if (pack.enviarCorreo !== false && ctx.actor.tipo !== "agent" && para) {
    try {
      await enviarCorreo(
        { db: ctx.db, tenantId: ctx.tenantId, correo: ctx.servicios.correo, urlBase: ctx.servicios.urlBase },
        EVENTO_CORREO_CLIENTE,
        para,
        await datosCorreoCliente(ctx, pack.correoPreview.datos),
      );
    } catch {
      /* best-effort */
    }
  }
  return documentoId;
}
