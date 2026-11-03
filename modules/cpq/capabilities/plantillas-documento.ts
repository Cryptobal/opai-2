import { z } from "zod";

import { defineCapability, noEncontrado } from "@opai/capabilities";

import { BASES_PLANTILLA, BLOQUES_COTIZACION } from "../domain/documento/bloques";
import { entradaPdfDesdeCotizacion } from "../persistencia/entrada-pdf-cotizacion";
import { pdfCotizacionConMarca } from "../persistencia/pdf-cotizacion";
import { cargarFilasVersion } from "../persistencia/recalcular";
import {
  actualizarPlantillaCotizacion,
  plantillaActivaCotizacion,
  plantillaActivaCotizacionLectura,
  vistaPlantilla,
} from "../persistencia/plantilla-documento";
import { PERMISO_MODELO, PERMISO_READ } from "./permisos";
import { uuidSchema } from "./esquemas";

const bloqueSchema = z.object({
  id: z.enum(BLOQUES_COTIZACION),
  activo: z.boolean(),
});

const plantillaSchema = z.object({
  id: z.string(),
  tipo: z.literal("cotizacion"),
  base: z.enum(BASES_PLANTILLA),
  version: z.number().int(),
  activa: z.boolean(),
  bloques: z.array(bloqueSchema),
  basesDisponibles: z.array(z.enum(BASES_PLANTILLA)),
});

export const plantillasDocumentoGet = defineCapability({
  id: "cpq.plantillas_documento.get",
  descripcion: "Plantilla activa de cotización: base (2–3 layouts) y bloques activables en orden fijo.",
  permiso: PERMISO_READ,
  input: z.object({}),
  output: plantillaSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    return {
      ...(await plantillaActivaCotizacionLectura(ctx)),
      basesDisponibles: [...BASES_PLANTILLA],
    };
  },
});

export const plantillasDocumentoUpdate = defineCapability({
  id: "cpq.plantillas_documento.update",
  descripcion:
    "Elige plantilla base y qué bloques muestra la cotización PDF; sin HTML libre; versiona al guardar.",
  permiso: PERMISO_MODELO,
  input: z.object({
    base: z.enum(BASES_PLANTILLA).optional(),
    bloques: z.array(bloqueSchema).max(BLOQUES_COTIZACION.length).optional(),
  }),
  output: plantillaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await actualizarPlantillaCotizacion(
      ctx,
      {
        ...(input.base !== undefined ? { base: input.base } : {}),
        ...(input.bloques !== undefined ? { bloques: input.bloques } : {}),
      },
      !dryRun,
    );
    return {
      ...vistaPlantilla(await plantillaActivaCotizacion(ctx)),
      basesDisponibles: [...BASES_PLANTILLA],
    };
  },
});

export const cotizacionesPreviewPdf = defineCapability({
  id: "cpq.cotizaciones.preview_pdf",
  descripcion:
    "Genera en servidor el PDF de la cotización con la marca y plantilla del tenant (vista previa, sin enviar).",
  permiso: PERMISO_READ,
  input: z.object({ id: uuidSchema }),
  output: z.object({
    pdfBase64: z.string(),
    bytes: z.number().int(),
    marcaDocumentoVersion: z.number().int(),
    plantillaDocumentoId: z.string(),
    plantillaDocumentoVersion: z.number().int(),
  }),
  efecto: "lectura",
  dryRun: true,
  async handler(ctx, input) {
    const pack = await cargarFilasVersion(ctx, input.id, undefined, false);
    if (!pack) throw noEncontrado("La versión");
    const { version } = pack;
    const entrada = await entradaPdfDesdeCotizacion(ctx, input.id);
    if (!entrada) throw noEncontrado("La cotización");
    const pdf = await pdfCotizacionConMarca(
      ctx,
      entrada,
      version.estado !== "borrador"
        ? {
            marcaDocumentoVersion: version.marcaDocumentoVersion,
            plantillaDocumentoId: version.plantillaDocumentoId,
            plantillaDocumentoVersion: version.plantillaDocumentoVersion,
          }
        : undefined,
      { siembraDocumento: false },
    );
    return {
      pdfBase64: Buffer.from(pdf.bytes).toString("base64"),
      bytes: pdf.bytes.byteLength,
      marcaDocumentoVersion: pdf.marcaVersion,
      plantillaDocumentoId: pdf.plantillaId,
      plantillaDocumentoVersion: pdf.plantillaVersion,
    };
  },
});
