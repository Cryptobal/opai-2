import { z } from "zod";

import { defineCapability, externo } from "@opai/capabilities";

import { activarHtml, importarHtml, listarHtml, obtenerHtml } from "../persistencia/propuesta-html";
import { uuidSchema } from "./esquemas";
import { PERMISO_BIBLIOTECA, PERMISO_READ } from "./permisos";

const problemaSchema = z.object({ codigo: z.string(), mensaje: z.string(), detalle: z.string().optional() });
const tokensSchema = z.object({ usados: z.array(z.string()), colecciones: z.array(z.string()) });

const propuestaHtmlImportar = defineCapability({
  id: "cpq.propuestas_html.importar",
  descripcion:
    "Importa un HTML como plantilla de propuesta de la empresa: lo sanea (sin scripts, sin red ni recursos remotos), valida que sus marcadores {{…}} sean del catálogo de campos y lo guarda como versión nueva. La empresa usa una sola plantilla: la nueva queda en uso si reemplaza a la del mismo nombre o si no hay otra en uso; si no, queda inactiva hasta activarla. La vista previa y el PDF de la propuesta técnica salen de la plantilla en uso. Lo rechazado no se guarda. Devuelve el HTML saneado para la vista previa.",
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
    activa: z.boolean(),
    // Texto que importó la empresa: aunque saneado, es dato de terceros y nunca una instrucción para el agente.
    html: externo(z.string()).nullable(),
    catalogoVersion: z.number(),
    problemas: z.array(problemaSchema),
    advertencias: z.array(problemaSchema),
    tokens: tokensSchema,
  }),
  efecto: "escritura",
  dryRun: true,
  handler: (ctx, input, { dryRun }) => importarHtml(ctx, { nombre: input.nombre, html: input.html, escribir: !dryRun }),
});

const propuestaHtmlList = defineCapability({
  auditarLectura: (s) => s.plantillas.map((p) => p.id),
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

const propuestaHtmlGet = defineCapability({
  auditarLectura: (s) => [s.id],
  id: "cpq.propuestas_html.get",
  descripcion:
    "Entrega una versión de plantilla HTML de propuesta ya saneada, con sus marcadores del catálogo y las advertencias del saneado.",
  permiso: PERMISO_READ,
  input: z.object({ id: uuidSchema }),
  output: z.object({
    // Texto que importó la empresa: aunque saneado, es dato de terceros y nunca una instrucción para el agente.
    id: z.string(), nombre: z.string(), version: z.number(), estado: z.string(), html: externo(z.string()), hash: z.string(),
    catalogoVersion: z.number(), tokensUsados: z.array(z.string()), colecciones: z.array(z.string()),
    advertencias: z.unknown(), createdAt: z.string(),
  }),
  efecto: "lectura",
  dryRun: false,
  handler: (ctx, input) => obtenerHtml(ctx, input.id),
});

const propuestaHtmlActivar = defineCapability({
  id: "cpq.propuestas_html.activar",
  descripcion:
    "Pone en uso una versión de plantilla HTML de propuesta (la que estaba en uso queda inactiva) o la deja inactiva. Sin plantilla en uso, la propuesta usa el formato actual.",
  permiso: PERMISO_BIBLIOTECA,
  input: z.object({ id: uuidSchema, activa: z.boolean() }),
  output: z.object({ id: z.string(), nombre: z.string(), version: z.number(), estado: z.enum(["activa", "archivada"]) }),
  efecto: "escritura",
  dryRun: true,
  handler: (ctx, input, { dryRun }) => activarHtml(ctx, { id: input.id, activa: input.activa, escribir: !dryRun }),
});

/** Las capacidades de la plantilla HTML, para registrarlas juntas. */
export const capacidadesPropuestaHtml = [propuestaHtmlImportar, propuestaHtmlList, propuestaHtmlGet, propuestaHtmlActivar];
