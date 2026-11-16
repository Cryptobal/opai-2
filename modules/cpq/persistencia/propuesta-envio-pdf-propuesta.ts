import { reglaDeNegocio, type Contexto } from "@opai/capabilities";

import {
  aplicarContratoABloques,
  textosBibliotecaConContrato,
} from "../domain/documento/propuesta-campos";
import { aperturaEfectiva } from "../domain/documento/propuesta-tecnica";
import type { SnapshotEnvioPropuesta } from "../domain/documento/propuesta-tecnica";
import { entradaPdfDesdeCotizacion } from "./entrada-pdf-cotizacion";
import { cargarLogoMarca } from "./pdf/logo";
import { textosBiblioteca } from "./pdf-propuesta-biblioteca";
import { renderPdfPropuestaHtml } from "./pdf-propuesta-html";
import { renderPdfPropuestaTecnica } from "./pdf-propuesta-tecnica";
import { marcaDocumentoEnVersion, type MarcaDocumentoVista, vistaMarcaDocumento } from "./marca-documento";
import { htmlConValores, plantillaHtmlDeEnvio } from "./propuesta-html-uso";
import { vistaPlantillaPropuesta } from "./plantilla-propuesta";
import type { ServicioDesdeCotizacion } from "../domain/documento/propuesta-tecnica";
import { capitulosDeEnvio } from "./propuesta-capitulos";
import { tasaIvaVentaTenant } from "./tasa-iva-tenant";

async function pdfHtmlDeEnvio(
  ctx: Contexto,
  snapshot: SnapshotEnvioPropuesta,
  ref: { id: string; hash: string },
  d: { cotizacionId: string; codigo: string; marca: MarcaDocumentoVista },
) {
  const entrada = await entradaPdfDesdeCotizacion(ctx, d.cotizacionId, { enviada: true });
  return renderPdfPropuestaHtml({
    codigo: d.codigo,
    fecha: entrada?.calculo.fecha ?? "",
    borrador: false,
    marca: d.marca,
    logo: await cargarLogoMarca(ctx),
    html: htmlConValores(await plantillaHtmlDeEnvio(ctx, ref), snapshot.camposContrato?.valores),
  });
}

export async function pdfPropuestaDesdeSnapshot(
  ctx: Contexto,
  snapshot: SnapshotEnvioPropuesta,
  input: {
    cotizacionId: string;
    codigo: string;
    titulo: string;
    servicio: ServicioDesdeCotizacion;
    netoTotalClp: number;
    propuestaTecnicaId?: string | null;
  },
) {
  const marca =
    (await marcaDocumentoEnVersion(ctx, snapshot.marcaDocumentoVersion)) ??
    (await vistaMarcaDocumento(ctx));
  if (snapshot.plantillaHtml) {
    return pdfHtmlDeEnvio(ctx, snapshot, snapshot.plantillaHtml, { ...input, marca });
  }
  const rowPl = await ctx.db.cpqPlantillaDocumento.findFirst({
    where: { id: snapshot.plantillaDocumentoId, tenantId: ctx.tenantId },
  });
  if (!rowPl) throw reglaDeNegocio("No se encontró la plantilla congelada del envío.");
  const rev = await ctx.db.cpqPlantillaDocumentoRevision.findFirst({
    where: {
      plantillaDocumentoId: snapshot.plantillaDocumentoId,
      version: snapshot.plantillaDocumentoVersion,
    },
  });
  const plantilla = vistaPlantillaPropuesta(
    rev ? { ...rowPl, base: rev.base, bloquesJson: rev.bloquesJson, version: rev.version } : rowPl,
  );
  const tasaIva = await tasaIvaVentaTenant(ctx);
  const entrada = await entradaPdfDesdeCotizacion(ctx, input.cotizacionId, { enviada: true });
  return renderPdfPropuestaTecnica({
    codigo: input.codigo,
    titulo: input.titulo,
    borrador: false,
    bloquesJson: aplicarContratoABloques(snapshot.propuestaBloquesJson, snapshot.camposContrato),
    marca,
    servicio: input.servicio,
    economia: {
      secciones: entrada?.secciones ?? [],
      cliente: entrada?.cliente ?? null,
      ejecutivo: entrada?.ejecutivo ?? null,
      negocio: entrada?.negocio ?? "",
      validaHasta: entrada?.validaHasta ?? null,
      condiciones: entrada?.condiciones ?? null,
      fecha: entrada?.calculo.fecha ?? "",
    },
    netoTotalClp: input.netoTotalClp,
    apertura: aperturaEfectiva(plantilla.aperturaMaxima, plantilla.aperturaMaxima),
    tasaIvaPct: tasaIva,
    textosBiblioteca: textosBibliotecaConContrato(
      await textosBiblioteca(ctx, snapshot.propuestaBloquesJson, snapshot.bloquesBiblioteca),
      snapshot.camposContrato,
    ),
    logo: await cargarLogoMarca(ctx),
    capitulos: await capitulosDeEnvio(ctx, input.propuestaTecnicaId ?? null),
  });
}
