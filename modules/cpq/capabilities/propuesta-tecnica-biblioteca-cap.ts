import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { BASES_PLANTILLA } from "../domain/documento/bloques";
import { TIPOS_BLOQUE_PROPUESTA, type BloquePlantillaPropuesta } from "../domain/documento/propuesta-tecnica";
import { publicarBloqueBiblioteca, sembrarBibliotecaEjemplo } from "../persistencia/biblioteca-bloques";
import {
  actualizarPlantillaPropuesta,
  plantillaActivaPropuesta,
  vistaPlantillaPropuesta,
} from "../persistencia/plantilla-propuesta";
import { PERMISO_BIBLIOTECA, PERMISO_READ } from "./permisos";
import { bloquePlantillaSchema } from "./propuesta-tecnica-esquemas";
import { uuidSchema } from "./esquemas";

export const bibliotecaBloquesList = defineCapability({
  id: "cpq.biblioteca_bloques.list",
  descripcion: "Lista la biblioteca de bloques de propuesta técnica del tenant.",
  permiso: PERMISO_READ,
  input: z.object({ tipo: z.enum(TIPOS_BLOQUE_PROPUESTA).optional() }),
  output: z.object({
    bloques: z.array(
      z.object({
        id: z.string(),
        clave: z.string(),
        tipo: z.enum(TIPOS_BLOQUE_PROPUESTA),
        titulo: z.string(),
        estado: z.enum(["borrador", "publicado"]),
        versionPublicada: z.number().int(),
        fijo: z.boolean(),
        opcional: z.boolean(),
      }),
    ),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    if (ctx.actor.id) await sembrarBibliotecaEjemplo(ctx, ctx.actor.id);
    const bloques = await ctx.db.cpqBibliotecaBloque.findMany({
      where: { tenantId: ctx.tenantId, ...(input.tipo ? { tipo: input.tipo } : {}) },
      orderBy: { titulo: "asc" },
    });
    return {
      bloques: bloques.map((b) => ({
        id: b.id,
        clave: b.clave,
        tipo: b.tipo as (typeof TIPOS_BLOQUE_PROPUESTA)[number],
        titulo: b.titulo,
        estado: b.estado as "borrador" | "publicado",
        versionPublicada: b.versionPublicada,
        fijo: b.fijo,
        opcional: b.opcional,
      })),
    };
  },
});

export const bibliotecaBloquesPublicar = defineCapability({
  id: "cpq.biblioteca_bloques.publicar",
  descripcion: "Publica un bloque de biblioteca (versiona el contenido).",
  permiso: PERMISO_BIBLIOTECA,
  input: z.object({ id: uuidSchema }),
  output: z.object({ id: z.string(), versionPublicada: z.number().int(), estado: z.literal("publicado") }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const row = await publicarBloqueBiblioteca(ctx, input.id, !dryRun);
    return { id: row.id, versionPublicada: row.versionPublicada, estado: "publicado" as const };
  },
});

export const plantillasPropuestaGet = defineCapability({
  id: "cpq.plantillas_propuesta.get",
  descripcion: "Devuelve la plantilla activa de propuesta técnica del tenant (base, bloques y apertura).",
  permiso: PERMISO_READ,
  input: z.object({}),
  output: z.object({
    id: z.string(),
    base: z.enum(BASES_PLANTILLA),
    version: z.number().int(),
    nombreVisible: z.string(),
    aperturaMaxima: z.enum(["por_instalacion", "por_categoria", "por_item"]),
    bloques: z.array(bloquePlantillaSchema),
    basesDisponibles: z.array(z.enum(BASES_PLANTILLA)),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const v = vistaPlantillaPropuesta(await plantillaActivaPropuesta(ctx));
    return { ...v, basesDisponibles: [...BASES_PLANTILLA] };
  },
});

export const plantillasPropuestaUpdate = defineCapability({
  id: "cpq.plantillas_propuesta.update",
  descripcion: "Actualiza la plantilla de propuesta técnica del tenant.",
  permiso: PERMISO_BIBLIOTECA,
  input: z.object({
    base: z.enum(BASES_PLANTILLA).optional(),
    nombreVisible: z.string().trim().max(120).optional(),
    aperturaMaxima: z.enum(["por_instalacion", "por_categoria", "por_item"]).optional(),
    bloques: z.array(bloquePlantillaSchema).optional(),
  }),
  output: plantillasPropuestaGet.output,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await actualizarPlantillaPropuesta(
      ctx,
      {
        ...(input.base !== undefined ? { base: input.base } : {}),
        ...(input.nombreVisible !== undefined ? { nombreVisible: input.nombreVisible } : {}),
        ...(input.aperturaMaxima !== undefined ? { aperturaMaxima: input.aperturaMaxima } : {}),
        ...(input.bloques !== undefined ? { bloques: input.bloques as BloquePlantillaPropuesta[] } : {}),
      },
      !dryRun,
    );
    const v = vistaPlantillaPropuesta(await plantillaActivaPropuesta(ctx));
    return { ...v, basesDisponibles: [...BASES_PLANTILLA] };
  },
});
