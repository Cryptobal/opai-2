import { z } from "zod";

import { defineCapability, externo, noEncontrado, reglaDeNegocio } from "@opai/capabilities";

import {
  htmlConValores,
  plantillaHtmlEnUso,
  valoresVistaHtml,
} from "../persistencia/propuesta-html-uso";
import { uuidSchema } from "./esquemas";
import { PERMISO_READ } from "./permisos";

const SIN_PLANTILLA = { html: null, nombre: null, version: null };

/** Documento de la propuesta con la plantilla HTML en uso, datos reales y el HTML ya saneado. */
export const propuestaTecnicaVistaHtml = defineCapability({
  auditarLectura: (_s, input) => [input.id, input.cotizacionId],
  id: "cpq.propuestas_tecnica.vista_html",
  descripcion:
    "Muestra la propuesta con la plantilla HTML en uso de la empresa y los datos de la cotización. El HTML va saneado, sin scripts ni recursos externos. Sin plantilla en uso, html es null y la pantalla usa el PDF con la marca.",
  permiso: PERMISO_READ,
  input: z.object({ id: uuidSchema, cotizacionId: uuidSchema }),
  output: z.object({
    html: externo(z.string()).nullable(),
    nombre: z.string().nullable(),
    version: z.number().int().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const prop = await ctx.db.cpqPropuestaTecnica.findFirst({
      where: { id: input.id },
      select: { cotizacionId: true },
    });
    if (!prop) throw noEncontrado("La propuesta técnica");
    if (prop.cotizacionId !== input.cotizacionId)
      throw reglaDeNegocio("La propuesta técnica no pertenece a esta cotización.");
    const plantilla = await plantillaHtmlEnUso(ctx);
    if (!plantilla) return SIN_PLANTILLA;
    const valores = await valoresVistaHtml(ctx, input.cotizacionId, plantilla.htmlSaneado);
    return {
      html: htmlConValores(plantilla.htmlSaneado, valores),
      nombre: plantilla.nombre,
      version: plantilla.version,
    };
  },
});
