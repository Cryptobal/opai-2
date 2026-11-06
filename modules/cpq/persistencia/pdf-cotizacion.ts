import type { Contexto } from "@opai/capabilities";

import { renderPdfCotizacion, type EntradaPdfCotizacion } from "./documento-pdf";
import { cargarLogoMarca } from "./pdf/logo";
import { marcaDocumentoEnVersion, vistaMarcaDocumento } from "./marca-documento";
import {
  plantillaActivaCotizacion,
  plantillaActivaCotizacionLectura,
  plantillaEnVersion,
  vistaPlantilla,
} from "./plantilla-documento";

export async function pdfCotizacionConMarca(
  ctx: Contexto,
  entrada: EntradaPdfCotizacion,
  refs?: {
    marcaDocumentoVersion?: number | null;
    plantillaDocumentoId?: string | null;
    plantillaDocumentoVersion?: number | null;
  },
  opciones?: { siembraDocumento?: boolean },
) {
  const siembra = opciones?.siembraDocumento ?? false;
  const marca =
    refs?.marcaDocumentoVersion != null
      ? ((await marcaDocumentoEnVersion(ctx, refs.marcaDocumentoVersion)) ??
        (await vistaMarcaDocumento(ctx)))
      : await vistaMarcaDocumento(ctx);
  let plantilla = siembra
    ? vistaPlantilla(await plantillaActivaCotizacion(ctx))
    : await plantillaActivaCotizacionLectura(ctx);
  if (refs?.plantillaDocumentoId && refs.plantillaDocumentoVersion != null) {
    const hist = await plantillaEnVersion(
      ctx,
      refs.plantillaDocumentoId,
      refs.plantillaDocumentoVersion,
    );
    if (hist) plantilla = hist;
  }
  return {
    bytes: await renderPdfCotizacion(entrada, marca, plantilla, {
      logo: await cargarLogoMarca(ctx),
    }),
    marcaVersion: marca.version,
    plantillaId: plantilla.id,
    plantillaVersion: plantilla.version,
  };
}
