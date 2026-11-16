import { reglaDeNegocio, type Contexto } from "@opai/capabilities";

import type { ServicioDesdeCotizacion, SnapshotEnvioPropuesta } from "../domain/documento/propuesta-tecnica";
import { marcaDocumentoEnVersion, vistaMarcaDocumento } from "./marca-documento";
import { pdfPropuestaDocumento } from "./pdf-propuesta-documento";
import { vistaPlantillaPropuesta } from "./plantilla-propuesta";
import { capitulosDeEnvio } from "./propuesta-capitulos";
import { plantillaHtmlDeEnvio } from "./propuesta-html-uso";

/** PDF de la propuesta de un envío, con lo congelado en su snapshot: plantilla, textos, marca y valores de los campos. */
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
  const rowPl = await ctx.db.cpqPlantillaDocumento.findFirst({
    where: { id: snapshot.plantillaDocumentoId, tenantId: ctx.tenantId },
  });
  if (!rowPl) throw reglaDeNegocio("No se encontró la plantilla congelada del envío.");
  const rev = await ctx.db.cpqPlantillaDocumentoRevision.findFirst({
    where: { plantillaDocumentoId: snapshot.plantillaDocumentoId, version: snapshot.plantillaDocumentoVersion },
  });
  const plantilla = vistaPlantillaPropuesta(
    rev ? { ...rowPl, base: rev.base, bloquesJson: rev.bloquesJson, version: rev.version } : rowPl,
  );
  return pdfPropuestaDocumento(ctx, {
    cotizacionId: input.cotizacionId,
    codigo: input.codigo,
    titulo: input.titulo,
    borrador: false,
    bloquesJson: snapshot.propuestaBloquesJson,
    versionesBiblioteca: snapshot.bloquesBiblioteca,
    htmlPlantilla: snapshot.plantillaHtml ? await plantillaHtmlDeEnvio(ctx, snapshot.plantillaHtml) : null,
    marca: (await marcaDocumentoEnVersion(ctx, snapshot.marcaDocumentoVersion)) ?? (await vistaMarcaDocumento(ctx)),
    servicio: input.servicio,
    netoTotalClp: input.netoTotalClp,
    apertura: plantilla.aperturaMaxima,
    capitulos: await capitulosDeEnvio(ctx, input.propuestaTecnicaId ?? null),
    ...(snapshot.camposContrato ? { valores: snapshot.camposContrato.valores } : {}),
  });
}
