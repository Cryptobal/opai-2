import type { Contexto } from "@opai/capabilities";
import { enviarCorreo } from "@opai/capabilities";

import { moverNegocioPropuestaEnviada } from "../persistencia/enviar-negocio";
import { registrarPdfPropuesta } from "../persistencia/registrar-pdf-propuesta";
import type { ResultadoCalculo } from "../domain/motor";

type PackEnviar = {
  cotizacionId: string;
  codigo: string;
  negocioId: string;
  versionId: string;
  versionNumero: number;
  contactoId: string;
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
  let documentoId = "";
  await ctx.transaccion(async (tx) => {
    documentoId = await registrarPdfPropuesta(ctx, tx, {
      cotizacionId: pack.cotizacionId,
      codigo: pack.codigo,
      pdf: pack.pdf,
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
  const para = pack.correoPreview.para;
  if (ctx.actor.tipo !== "agent" && para) {
    try {
      await enviarCorreo(
        { db: ctx.db, tenantId: ctx.tenantId, correo: ctx.servicios.correo, urlBase: ctx.servicios.urlBase },
        "cpq.cotizacion.enviada",
        para,
        pack.correoPreview.datos,
      );
    } catch {
      /* best-effort */
    }
  }
  return documentoId;
}
