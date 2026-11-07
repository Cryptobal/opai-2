import type { Contexto } from "@opai/capabilities";

import { commitEnviarCotizacion } from "../capabilities/enviar-commit";
import { entradaPdfDesdeCotizacion } from "./entrada-pdf-cotizacion";
import { pdfCotizacionConMarca } from "./pdf-cotizacion";
import type { SnapshotEnvioPropuesta } from "../domain/documento/propuesta-tecnica";
import type { VersionEsperada } from "./version-esperada";
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
    versionEsperada: VersionEsperada;
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
  const entrada =
    (await entradaPdfDesdeCotizacion(ctx, input.cotizacionId, { enviada: true })) ?? {
      codigo: input.codigo,
      titulo: input.titulo,
      negocio: input.negocioTitulo,
      secciones: input.seccionesVista.map((s) => ({
        nombre: s.nombre,
        lineas: s.lineas.map((l) => ({ nombre: l.nombre, tipo: l.tipo })),
      })),
      calculo: {
        ventaMensual: input.calculoPublico.ventaMensual ?? null,
        fecha: input.calculoPublico.fecha ?? "",
        pagosUnicos: input.calculoPublico.pagosUnicos ?? 0,
        borradorSinPrecio: input.calculoPublico.ventaMensual == null,
      },
    };
  const pdfCotPack = await pdfCotizacionConMarca(
    ctx,
    entrada,
    {
      marcaDocumentoVersion: input.snapshot.marcaDocumentoVersion,
      plantillaDocumentoId: input.snapshot.plantillaDocumentoId,
      plantillaDocumentoVersion: input.snapshot.plantillaDocumentoVersion,
    },
    { siembraDocumento: false },
  );
  const documentoId = await commitEnviarCotizacion(ctx, {
    cotizacionId: input.cotizacionId,
    codigo: input.codigo,
    negocioId: input.negocioId,
    versionId: input.versionId,
    versionNumero: input.versionNumero,
    versionEsperada: input.versionEsperada,
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
  return { documentoId, pdf: pdfCotPack.bytes };
}
