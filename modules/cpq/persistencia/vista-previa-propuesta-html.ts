import { noEncontrado, reglaDeNegocio, type Contexto } from "@opai/capabilities";

import { cotizacionDe } from "../capabilities/util";
import { marcoHtmlA4 } from "../domain/documento/html-marco-a4";
import { armarHtmlPropuestaVista, htmlPlantillaVigente } from "./armar-html-propuesta";
import { vistaMarcaDocumento } from "./marca-documento";
import { obtenerHtml } from "./propuesta-html";
import { capitulosDePropuesta } from "./propuesta-capitulos";
import { plantillaActivaPropuesta, vistaPlantillaPropuesta } from "./plantilla-propuesta";
import { packServicioCotizacion, proyectarCalculo, recalcularVersion, cargarFilasVersion } from "./recalcular";
import { servicioDesdeFilas } from "./propuesta-tecnica";

export async function vistaPreviaPropuestaHtml(
  ctx: Contexto,
  input: { cotizacionId: string; plantillaId?: string | undefined; html?: string | undefined },
) {
  const c = await cotizacionDe(ctx, input.cotizacionId);
  const pack = await cargarFilasVersion(ctx, c.id, undefined, false);
  if (!pack) throw noEncontrado("La versión");
  const resultado = await recalcularVersion(ctx, c.id, undefined, false);
  if (!resultado) throw reglaDeNegocio("No se pudo calcular la cotización.");
  const prop = await ctx.db.cpqPropuestaTecnica.findFirst({ where: { versionId: pack.version.id } });
  const bloquesJson = prop?.bloquesJson ?? JSON.stringify(vistaPlantillaPropuesta(await plantillaActivaPropuesta(ctx)).bloques);
  const htmlPlantilla = input.html?.trim()
    ? input.html
  : input.plantillaId
      ? (await obtenerHtml(ctx, input.plantillaId)).html
      : (await htmlPlantillaVigente(ctx, c.titulo, c.id)).html;
  const plantilla = vistaPlantillaPropuesta(await plantillaActivaPropuesta(ctx));
  const { html, faltantes, crudos } = await armarHtmlPropuestaVista(ctx, {
    cotizacionId: c.id,
    titulo: c.titulo,
    borrador: true,
    bloquesJson,
    htmlPlantilla,
    marca: await vistaMarcaDocumento(ctx),
    servicio: servicioDesdeFilas(packServicioCotizacion(c, pack)),
    netoTotalClp: proyectarCalculo(ctx, resultado).ventaMensual ?? 0,
    apertura: plantilla.aperturaMaxima,
    capitulos: prop ? await capitulosDePropuesta(ctx, prop) : [],
  });
  return {
    html: marcoHtmlA4(html),
    cotizacionCodigo: c.codigo,
    marcadoresVacios: faltantes,
    marcadoresSinResolver: crudos,
  };
}