import { z } from "zod";

import { defineCapability, noEncontrado } from "@opai/capabilities";

import { BASES_PLANTILLA, BLOQUES_COTIZACION } from "../domain/documento/bloques";
import { pdfCotizacionConMarca } from "../persistencia/pdf-cotizacion";
import { cargarFilasVersion, proyectarCalculo, recalcularVersion } from "../persistencia/recalcular";
import { calculoCongelado } from "../persistencia/calculo-congelado";
import {
  actualizarPlantillaCotizacion,
  plantillaActivaCotizacion,
  plantillaActivaCotizacionLectura,
  vistaPlantilla,
} from "../persistencia/plantilla-documento";
import { PERMISO_MODELO, PERMISO_READ } from "./permisos";
import { cotizacionDe } from "./util";
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
    const c = await cotizacionDe(ctx, input.id);
    const pack = await cargarFilasVersion(ctx, input.id, undefined, false);
    if (!pack) throw noEncontrado("La versión");
    const { version, secciones, lineas } = pack;
    const resultado =
      version.estado === "borrador"
        ? await recalcularVersion(ctx, input.id, undefined, false)
        : calculoCongelado(ctx, version, lineas);
    if (!resultado) throw noEncontrado("El cálculo");
    const calculo = proyectarCalculo(ctx, resultado);
    const neg = await ctx.db.negocio.findFirst({
      where: { id: c.negocioId },
      select: { titulo: true },
    });
    const seccionesVista = secciones.map((s) => ({
      nombre: s.nombre,
      lineas: lineas.filter((l) => l.seccionId === s.id).map((l) => ({ nombre: l.nombre })),
    }));
    const pdf = await pdfCotizacionConMarca(
      ctx,
      {
        codigo: c.codigo,
        titulo: c.titulo,
        negocio: neg?.titulo ?? "",
        secciones: seccionesVista,
        calculo: {
          ventaMensual: calculo.ventaMensual ?? null,
          fecha: calculo.fecha ?? "",
          pagosUnicos: "pagosUnicos" in calculo ? calculo.pagosUnicos : 0,
        },
      },
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
