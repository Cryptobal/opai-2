import type { Contexto } from "@opai/capabilities";
import { conflicto } from "@opai/capabilities";

import { enviarCorreoCliente } from "../persistencia/correo-cliente";
import { moverNegocioPropuestaEnviada } from "../persistencia/enviar-negocio";
import {
  eliminarPdfPropuestaAlmacenamiento,
  registrarPdfPropuestaMetadatos,
  subirPdfPropuestaAlmacenamiento,
} from "../persistencia/registrar-pdf-propuesta";
import { exigirVersionEsperada, type VersionEsperada } from "../persistencia/version-esperada";
import type { ResultadoCalculo } from "../domain/motor";

type PackEnviar = {
  cotizacionId: string;
  codigo: string;
  negocioId: string;
  versionId: string;
  versionNumero: number;
  /** Estado y huella que validó el envío al inicio; el commit exige exactamente esos. */
  versionEsperada: VersionEsperada;
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
      // Condicionado al estado exacto que se validó al inicio y a la huella de la versión: si alguien
      // reabrió (aunque la haya vuelto a dejar lista) o editó mientras se armaba el PDF, no se marca
      // enviada con un cálculo y un documento que ya no corresponden (CAR-192).
      await exigirVersionEsperada(tx, pack.versionId, pack.versionEsperada);
      const marcada = await tx.cpqVersion.updateMany({
        where: { id: pack.versionId, tenantId: ctx.tenantId, estado: pack.versionEsperada.estado, revision: pack.versionEsperada.revision },
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
      if (marcada.count === 0)
        throw conflicto("La cotización cambió mientras se preparaba el envío; vuelve a cargar la ficha.");
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
    const neg = await ctx.db.negocio.findFirst({ where: { id: pack.negocioId }, select: { cuentaId: true } });
    const texto = (k: string) => (typeof pack.correoPreview.datos[k] === "string" ? (pack.correoPreview.datos[k] as string) : "");
    await enviarCorreoCliente(ctx, {
      para,
      contactoId: pack.contactoId,
      cuentaId: neg?.cuentaId ?? null,
      negocioId: pack.negocioId,
      cotizacionId: pack.cotizacionId,
      codigo: pack.codigo,
      titulo: texto("titulo"),
      version: pack.versionNumero,
      mensaje: texto("mensaje"),
      pdfs: [
        {
          clave: "cotizacion",
          nombre: `Cotizacion-${pack.codigo}.pdf`,
          bytes: pack.pdf.byteLength,
          contenido: pack.pdf,
          storageKey: subido.storageKey,
        },
      ],
    });
  }
  return documentoId;
}
