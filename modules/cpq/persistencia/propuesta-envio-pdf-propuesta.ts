import { reglaDeNegocio, type Contexto } from "@opai/capabilities";

import { aperturaEfectiva } from "../domain/documento/propuesta-tecnica";
import type { SnapshotEnvioPropuesta } from "../domain/documento/propuesta-tecnica";
import { entradaPdfDesdeCotizacion } from "./entrada-pdf-cotizacion";
import { cargarLogoMarca } from "./pdf/logo";
import { textosBiblioteca } from "./pdf-propuesta-biblioteca";
import { renderPdfPropuestaTecnica } from "./pdf-propuesta-tecnica";
import { marcaDocumentoEnVersion, vistaMarcaDocumento } from "./marca-documento";
import { vistaPlantillaPropuesta } from "./plantilla-propuesta";
import type { ServicioDesdeCotizacion } from "../domain/documento/propuesta-tecnica";
import { tasaIvaVentaTenant } from "./tasa-iva-tenant";

export async function pdfPropuestaDesdeSnapshot(
  ctx: Contexto,
  snapshot: SnapshotEnvioPropuesta,
  input: {
    cotizacionId: string;
    codigo: string;
    titulo: string;
    servicio: ServicioDesdeCotizacion;
    netoTotalClp: number;
  },
) {
  const marca =
    (await marcaDocumentoEnVersion(ctx, snapshot.marcaDocumentoVersion)) ??
    (await vistaMarcaDocumento(ctx));
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
    bloquesJson: snapshot.propuestaBloquesJson,
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
    textosBiblioteca: await textosBiblioteca(
      ctx,
      snapshot.propuestaBloquesJson,
      snapshot.bloquesBiblioteca,
    ),
    logo: await cargarLogoMarca(ctx),
  });
}
