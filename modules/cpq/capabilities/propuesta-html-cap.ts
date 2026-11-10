import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { importarHtml, listarHtml, obtenerHtml } from "../persistencia/propuesta-html";
import { uuidSchema } from "./esquemas";
import { PERMISO_BIBLIOTECA, PERMISO_READ } from "./permisos";

const problemaSchema = z.object({ codigo: z.string(), mensaje: z.string(), detalle: z.string().optional() });
const tokensSchema = z.object({ usados: z.array(z.string()), colecciones: z.array(z.string()) });

export const propuestaHtmlImportar = defineCapability({
  id: "cpq.propuestas_html.importar",
  descripcion:
    "Importa un HTML como plantilla de propuesta de la empresa: lo sanea (sin scripts, sin red ni recursos remotos), valida que sus marcadores {{…}} sean del catálogo de campos y lo guarda como versión nueva. Lo rechazado no se guarda. No genera PDF: el PDF actual no usa esta plantilla.",
  permiso: PERMISO_BIBLIOTECA,
  input: z.object({
    nombre: z.string().min(1).max(120).describe("Nombre de la plantilla; cada importación con el mismo nombre crea una versión nueva."),
    html: z.string().min(1).max(400_000),
  }),
  sensibles: ["html"],
  output: z.object({
    guardada: z.boolean(),
    sinCambios: z.boolean(),
    nombre: z.string(),
    version: z.number().nullable(),
    id: z.string().nullable(),
    hash: z.string().nullable(),
    catalogoVersion: z.number(),
    problemas: z.array(problemaSchema),
    advertencias: z.array(problemaSchema),
    tokens: tokensSchema,
  }),
  efecto: "escritura",
  dryRun: true,
  handler: (ctx, input, { dryRun }) => importarHtml(ctx, { nombre: input.nombre, html: input.html, escribir: !dryRun }),
});

export const propuestaHtmlList = defineCapability({
  id: "cpq.propuestas_html.list",
  descripcion:
    "Lista las plantillas HTML de propuesta importadas por la empresa, con su versión, estado, huella y marcadores usados. No incluye el HTML.",
  permiso: PERMISO_READ,
  input: z.object({ nombre: z.string().max(120).optional() }),
  output: z.object({
    plantillas: z.array(
      z.object({
        id: z.string(), nombre: z.string(), version: z.number(), estado: z.string(), hashSha256: z.string(),
        catalogoVersion: z.number(), tokensUsados: z.array(z.string()), createdAt: z.string(),
      }),
    ),
  }),
  efecto: "lectura",
  dryRun: false,
  handler: async (ctx, input) => ({ plantillas: await listarHtml(ctx, input.nombre) }),
});

export const propuestaHtmlGet = defineCapability({
  id: "cpq.propuestas_html.get",
  descripcion:
    "Entrega una versión de plantilla HTML de propuesta ya saneada, con sus marcadores del catálogo y las advertencias del saneado.",
  permiso: PERMISO_READ,
  input: z.object({ id: uuidSchema }),
  output: z.object({
    id: z.string(), nombre: z.string(), version: z.number(), estado: z.string(), html: z.string(), hash: z.string(),
    catalogoVersion: z.number(), tokensUsados: z.array(z.string()), colecciones: z.array(z.string()),
    advertencias: z.unknown(), createdAt: z.string(),
  }),
  efecto: "lectura",
  dryRun: false,
  handler: (ctx, input) => obtenerHtml(ctx, input.id),
});
