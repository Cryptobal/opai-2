import { noEncontrado, type Contexto } from "@opai/capabilities";

import { armarHtmlPropuesta, type EntradaHtmlPropuesta } from "./armar-html-propuesta";
import { entradaPdfDesdeCotizacion } from "./entrada-pdf-cotizacion";
import { cargarLogoMarca } from "./pdf/logo";
import { renderPdfPropuestaHtml } from "./pdf-propuesta-html";

export type EntradaDocumentoPropuesta = EntradaHtmlPropuesta & { codigo: string };

/**
 * Único motor del PDF de la propuesta (CAR-575): la plantilla HTML de la empresa (o la base de OPAI) con las secciones
 * activas del armador donde está `{{secciones}}`. La vista previa y el envío pasan por aquí; solo cambian los valores.
 */
export async function pdfPropuestaDocumento(ctx: Contexto, d: EntradaDocumentoPropuesta): Promise<Uint8Array> {
  const entrada = await entradaPdfDesdeCotizacion(ctx, d.cotizacionId, { enviada: !d.borrador });
  if (!entrada) throw noEncontrado("La cotización");
  const html = await armarHtmlPropuesta(ctx, d);
  return renderPdfPropuestaHtml({
    codigo: d.codigo,
    fecha: entrada.calculo.fecha,
    borrador: d.borrador,
    marca: d.marca,
    logo: await cargarLogoMarca(ctx),
    html,
  });
}