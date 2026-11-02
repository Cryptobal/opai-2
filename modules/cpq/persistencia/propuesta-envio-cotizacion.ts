import type { Contexto } from "@opai/capabilities";

import { commitEnviarCotizacion } from "../capabilities/enviar-commit";
import { pdfCotizacionConMarca } from "./pdf-cotizacion";
import type { SnapshotEnvioPropuesta } from "../domain/documento/propuesta-tecnica";
import type { ResultadoCalculo } from "../domain/motor";

export async function documentoCotizacionEnvioConjunto(
  ctx: Contexto,
  input: {
    snapshot: SnapshotEnvioPropuesta;
    cotizacionId: string;
    codigo: string;
    titulo: string;
    negocioTitulo: string;
    negocioId: string;
    versionId: string;
    versionNumero: number;
    contactoId: string | null;
    resultado: ResultadoCalculo;
    seccionesVista: { nombre: string; lineas: { nombre: string; tipo: string }[] }[];
    calculoPublico: {
      ventaMensual: number | null;
      fecha?: string;
      pagosUnicos?: number;
    };
    mensaje: string | null;
    neg: {
      id: string;
      etapaId: string;
      estado: string;
      createdAt: Date;
      embudoId: string;
    };
    emailPreview: string | null;
  },
) {
  const pdfCotPack = await pdfCotizacionConMarca(
    ctx,
    {
      codigo: input.codigo,
      titulo: input.titulo,
      negocio: input.negocioTitulo,
      secciones: input.seccionesVista,
      calculo: {
        ventaMensual: input.calculoPublico.ventaMensual ?? null,
        fecha: input.calculoPublico.fecha ?? "",
        pagosUnicos: input.calculoPublico.pagosUnicos ?? 0,
        borradorSinPrecio: input.calculoPublico.ventaMensual == null,
      },
    },
    {
      marcaDocumentoVersion: input.snapshot.marcaDocumentoVersion,
      plantillaDocumentoId: input.snapshot.plantillaDocumentoId,
      plantillaDocumentoVersion: input.snapshot.plantillaDocumentoVersion,
    },
    { siembraDocumento: false },
  );
  return commitEnviarCotizacion(ctx, {
    cotizacionId: input.cotizacionId,
    codigo: input.codigo,
    negocioId: input.negocioId,
    versionId: input.versionId,
    versionNumero: input.versionNumero,
    contactoId: input.contactoId,
    pdf: pdfCotPack.bytes,
    pdfPack: pdfCotPack,
    resultado: input.resultado,
    neg: input.neg,
    enviarCorreo: false,
    correoPreview: {
      para: input.emailPreview,
      datos: {
        codigo: input.codigo,
        titulo: input.titulo,
        negocio: input.negocioTitulo,
        ventaMensual: input.calculoPublico.ventaMensual,
        mensaje: input.mensaje ?? "",
      },
    },
  });
}
