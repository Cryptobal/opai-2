import type { Contexto } from "@opai/capabilities";

import type { CapituloVista } from "../domain/documento/capitulo-instalacion";
import type { ServicioDesdeCotizacion } from "../domain/documento/propuesta-tecnica";
import type { MarcaDocumentoVista } from "./marca-documento";
import { pdfPropuestaDocumento } from "./pdf-propuesta-documento";
import type { PlantillaPropuestaVista } from "./plantilla-propuesta";
import { plantillaHtmlEnUso } from "./propuesta-html-uso";

/** Vista previa (o borrador) del PDF de la propuesta técnica con los datos vigentes de la cotización. */
export async function pdfPropuestaVista(
  ctx: Contexto,
  d: {
    cotizacionId: string;
    codigo: string;
    titulo: string;
    borrador: boolean;
    bloquesJson: string;
    plantilla: PlantillaPropuestaVista;
    marca: MarcaDocumentoVista;
    servicio: ServicioDesdeCotizacion;
    netoTotalClp: number;
    capitulos: readonly CapituloVista[];
  },
): Promise<Uint8Array> {
  const { plantilla, ...resto } = d;
  return pdfPropuestaDocumento(ctx, {
    ...resto,
    apertura: plantilla.aperturaMaxima,
    htmlPlantilla: (await plantillaHtmlEnUso(ctx))?.htmlSaneado ?? null,
  });
}
