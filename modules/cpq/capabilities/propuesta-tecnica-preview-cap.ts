import { z } from "zod";

import { defineCapability, noEncontrado, reglaDeNegocio } from "@opai/capabilities";

import { capitulosDePropuesta } from "../persistencia/propuesta-capitulos";
import { vistaMarcaDocumento } from "../persistencia/marca-documento";
import { pdfPropuestaVista } from "../persistencia/pdf-propuesta-vista";
import { plantillaActivaPropuesta, vistaPlantillaPropuesta } from "../persistencia/plantilla-propuesta";
import { servicioDesdeFilas } from "../persistencia/propuesta-tecnica";
import { cargarFilasVersion, packServicioCotizacion, proyectarCalculo, recalcularVersion } from "../persistencia/recalcular";
import { PERMISO_READ } from "./permisos";
import { uuidSchema } from "./esquemas";
import { cotizacionDe } from "./util";

export const propuestaTecnicaPreviewPdf = defineCapability({
  auditarLectura: (_s, input) => [input.id, input.cotizacionId],
  id: "cpq.propuestas_tecnica.preview_pdf",
  descripcion: "Genera PDF de propuesta técnica (marca de agua BORRADOR si no está enviada). Sale de la plantilla HTML en uso de la empresa (o de la base de OPAI) con los datos de la cotización; `{{secciones}}` inserta las secciones activas del armador.",
  permiso: PERMISO_READ,
  input: z.object({ id: uuidSchema, cotizacionId: uuidSchema }),
  output: z.object({ pdfBase64: z.string(), bytes: z.number().int(), borrador: z.boolean() }),
  efecto: "lectura",
  dryRun: true,
  async handler(ctx, input) {
    const c = await cotizacionDe(ctx, input.cotizacionId);
    const prop = await ctx.db.cpqPropuestaTecnica.findFirst({ where: { id: input.id } });
    if (!prop) throw noEncontrado("La propuesta técnica");
    if (prop.cotizacionId !== input.cotizacionId) {
      throw reglaDeNegocio("La propuesta técnica no pertenece a esta cotización.");
    }
    const pack = await cargarFilasVersion(ctx, input.cotizacionId, undefined, false);
    if (!pack) throw noEncontrado("La versión");
    const resultado = await recalcularVersion(ctx, input.cotizacionId, undefined, false);
    if (!resultado) throw noEncontrado("La versión");
    const plantilla = vistaPlantillaPropuesta(await plantillaActivaPropuesta(ctx));
    const bytes = await pdfPropuestaVista(ctx, {
      cotizacionId: input.cotizacionId,
      codigo: c.codigo,
      titulo: c.titulo,
      borrador: prop.estado !== "congelada",
      bloquesJson: prop.bloquesJson,
      plantilla,
      marca: await vistaMarcaDocumento(ctx),
      servicio: servicioDesdeFilas(packServicioCotizacion(c, pack)),
      netoTotalClp: proyectarCalculo(ctx, resultado).ventaMensual ?? 0,
      capitulos: await capitulosDePropuesta(ctx, prop),
    });
    return { pdfBase64: Buffer.from(bytes).toString("base64"), bytes: bytes.byteLength, borrador: prop.estado !== "congelada" };
  },
});