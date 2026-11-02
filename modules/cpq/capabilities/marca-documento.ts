import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { TIPOGRAFIAS } from "../domain/documento/bloques";
import {
  actualizarMarcaDocumento,
  vistaMarcaDocumento,
  type MarcaDocumentoVista,
} from "../persistencia/marca-documento";
import { PERMISO_MODELO, PERMISO_READ } from "./permisos";

const marcaOutput = z.object({
  version: z.number().int(),
  tipografia: z.enum(TIPOGRAFIAS),
  piePagina: z.string().nullable(),
  condicionesDefault: z.string().nullable(),
  nombreComercial: z.string().nullable(),
  razonSocial: z.string().nullable(),
  rut: z.string().nullable(),
  direccion: z.string().nullable(),
  colorPrimario: z.string().nullable(),
  colorSecundario: z.string().nullable(),
  logoUrl: z.string().nullable(),
  enlaceMarcaNucleo: z.literal("/configuracion/marca"),
});

export const marcaDocumentoGet = defineCapability({
  id: "cpq.marca_documento.get",
  descripcion:
    "Marca documental CPQ del tenant: tipografía acotada, pie y condiciones; logos y colores en Configuración › Marca (núcleo).",
  permiso: PERMISO_READ,
  input: z.object({}),
  output: marcaOutput,
  efecto: "lectura",
  dryRun: false,
  handler: async (ctx) => ({
    ...(await vistaMarcaDocumento(ctx)),
    enlaceMarcaNucleo: "/configuracion/marca" as const,
  }),
});

export const marcaDocumentoUpdate = defineCapability({
  id: "cpq.marca_documento.update",
  descripcion:
    "Actualiza tipografía, pie de página y condiciones comerciales por defecto de los documentos CPQ; versiona para reimpresión.",
  permiso: PERMISO_MODELO,
  input: z.object({
    tipografia: z.enum(TIPOGRAFIAS).optional(),
    piePagina: z.string().trim().max(2000).nullable().optional(),
    condicionesDefault: z.string().trim().max(8000).nullable().optional(),
  }),
  output: marcaOutput,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await actualizarMarcaDocumento(ctx, input as Partial<MarcaDocumentoVista>, !dryRun);
    return { ...(await vistaMarcaDocumento(ctx)), enlaceMarcaNucleo: "/configuracion/marca" as const };
  },
});
