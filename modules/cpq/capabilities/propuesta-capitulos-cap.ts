import { z } from "zod";

import { defineCapability, noEncontrado, reglaDeNegocio } from "@opai/capabilities";

import {
  CLAVES_SECCION_CAPITULO,
  MAX_TEXTO_CAPITULO,
  ORIGENES_CAPITULO,
  normalizarTextoCapitulo,
} from "../domain/documento/capitulo-instalacion";
import { capitulosDePropuesta, guardarSeccionCapitulo } from "../persistencia/propuesta-capitulos";
import { uuidSchema } from "./esquemas";
import { PERMISO_MANAGE, PERMISO_READ } from "./permisos";

const claveSchema = z.enum(CLAVES_SECCION_CAPITULO as [string, ...string[]]);

const capituloSchema = z.object({
  instalacionId: z.string(),
  nombre: z.string(),
  direccion: z.string().nullable(),
  mapaUrl: z.string().nullable(),
  puestos: z.array(
    z.object({
      nombre: z.string(),
      guardiasSimultaneos: z.number(),
      dotacion: z.number().nullable(),
      turno: z.string(),
    }),
  ),
  totales: z.object({ guardiasSimultaneos: z.number(), dotacion: z.number().nullable() }),
  secciones: z.array(z.object({ clave: z.string(), titulo: z.string(), texto: z.string() })),
  faltantes: z.array(z.object({ clave: z.string(), titulo: z.string() })),
});

export const propuestaCapitulosList = defineCapability({
  auditarLectura: (s, input) => [input.propuestaId, ...(s?.capitulos.map((c) => c.instalacionId) ?? [])],
  id: "cpq.propuestas_tecnica.capitulos_list",
  descripcion:
    "Lista el capítulo por instalación de la propuesta técnica: dirección, puestos, dotación derivada del CPQ, textos escritos y faltantes verificables.",
  permiso: PERMISO_READ,
  input: z.object({ propuestaId: uuidSchema }),
  output: z.object({ propuestaId: z.string(), estado: z.string(), capitulos: z.array(capituloSchema) }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const prop = await ctx.db.cpqPropuestaTecnica.findFirst({ where: { id: input.propuestaId } });
    if (!prop) throw noEncontrado("La propuesta técnica");
    const capitulos = await capitulosDePropuesta(ctx, prop);
    return { propuestaId: prop.id, estado: prop.estado, capitulos };
  },
});

export const propuestaCapitulosGuardar = defineCapability({
  id: "cpq.propuestas_tecnica.capitulo_guardar",
  descripcion:
    "Guarda el texto de una sección del capítulo de una instalación (vacío la quita). Solo texto escrito por una persona o sugerencia de IA que ella aceptó; no cambia precios ni dotación.",
  permiso: PERMISO_MANAGE,
  input: z.object({
    propuestaId: uuidSchema,
    instalacionId: uuidSchema,
    seccionClave: claveSchema,
    contenido: z.string().max(MAX_TEXTO_CAPITULO * 2),
    origen: z.enum(ORIGENES_CAPITULO).default("manual"),
  }),
  output: z.object({
    propuestaId: z.string(),
    instalacionId: z.string(),
    seccionClave: z.string(),
    eliminada: z.boolean(),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    let contenido: string;
    try {
      contenido = normalizarTextoCapitulo(input.contenido);
    } catch {
      throw reglaDeNegocio(`El texto de la sección supera los ${MAX_TEXTO_CAPITULO} caracteres.`);
    }
    return guardarSeccionCapitulo(ctx, {
      propuestaId: input.propuestaId,
      instalacionId: input.instalacionId,
      seccionClave: input.seccionClave as (typeof CLAVES_SECCION_CAPITULO)[number],
      contenido,
      origen: input.origen,
      escribir: !dryRun,
    });
  },
});
