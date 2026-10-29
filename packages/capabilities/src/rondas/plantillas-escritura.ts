import { z } from "zod";

import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { uuidSchema } from "../core/esquemas";
import { definidos, sinDuplicado } from "../core/maestros/comun";
import type { Contexto } from "../types";
import { PERMISO_CONFIG, dondeInstalacionId, instalacionEnAlcance, ordenSchema, plantillaDe } from "./comun";
import { plantillaSchema } from "./vistas";
import { vistaPlantilla } from "./plantillas-lectura";

const puntoLineaSchema = z.object({
  puntoId: uuidSchema,
  orden: z.number().int().min(0).max(200),
  obligatorio: z.boolean().default(true),
});

const puntosSchema = z
  .array(puntoLineaSchema)
  .min(1)
  .max(200)
  .refine((ps) => new Set(ps.map((p) => p.puntoId)).size === ps.length, "No repitas un punto")
  .refine((ps) => new Set(ps.map((p) => p.orden)).size === ps.length, "No repitas un orden");

const camposPlantilla = {
  ordenModo: ordenSchema.default("sugerido"),
  tiempoMaxMin: z.number().int().min(5).max(480),
  tiempoMaxTramoMin: z.number().int().min(1).max(480).nullable().optional(),
  umbralIncompletaPct: z.number().int().min(0).max(100).default(20),
  permiteAdhoc: z.boolean().default(true),
};

const incluir = {
  puntos: { orderBy: { orden: "asc" }, select: { puntoId: true, orden: true, obligatorio: true } },
} as const;

/** Los puntos son activos, de la misma instalación y del alcance del actor (ADR-022, sin enumeración). */
async function puntosDeInstalacion(ctx: Contexto, instalacionId: string, ids: readonly string[]) {
  const filas = await ctx.db.puntoControl.findMany({
    where: { id: { in: [...ids] }, instalacionId, estado: "activo", ...dondeInstalacionId(ctx) },
    select: { id: true },
  });
  if (filas.length !== new Set(ids).size) throw noEncontrado("El punto de control");
}

function validarTramo(total: number, tramo: number | null | undefined) {
  if (tramo != null && tramo >= total)
    throw reglaDeNegocio("El tiempo por tramo debe ser menor que el total.");
}

/** Crea una plantilla de ronda con su secuencia de puntos, orden y tiempos. */
export const plantillasCrear = defineCapability({
  id: "rondas.plantillas.crear",
  descripcion:
    "Arma una plantilla de ronda de una instalación: nombre, orden de los puntos (sugerido, estricto o aleatorio), tiempos máximos, umbral de incompleta y la secuencia de puntos obligatorios u opcionales.",
  permiso: PERMISO_CONFIG,
  input: z.object({
    instalacionId: uuidSchema,
    nombre: z.string().trim().min(2).max(80),
    ...camposPlantilla,
    puntos: puntosSchema,
  }),
  output: plantillaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await instalacionEnAlcance(ctx, input.instalacionId);
    validarTramo(input.tiempoMaxMin, input.tiempoMaxTramoMin);
    await puntosDeInstalacion(ctx, input.instalacionId, input.puntos.map((p) => p.puntoId));
    if (dryRun) {
      return vistaPlantilla({
        id: "",
        instalacionId: input.instalacionId,
        nombre: input.nombre,
        ordenModo: input.ordenModo,
        tiempoMaxMin: input.tiempoMaxMin,
        tiempoMaxTramoMin: input.tiempoMaxTramoMin ?? null,
        umbralIncompletaPct: input.umbralIncompletaPct,
        permiteAdhoc: input.permiteAdhoc,
        estado: "activo",
        puntos: input.puntos,
      });
    }
    const creada = await ctx.transaccion(async (tx) => {
      const pl = await sinDuplicado(
        tx.plantillaRonda.create({
          data: {
            tenantId: ctx.tenantId,
            instalacionId: input.instalacionId,
            nombre: input.nombre,
            ordenModo: input.ordenModo,
            tiempoMaxMin: input.tiempoMaxMin,
            tiempoMaxTramoMin: input.tiempoMaxTramoMin ?? null,
            umbralIncompletaPct: input.umbralIncompletaPct,
            permiteAdhoc: input.permiteAdhoc,
            estado: "activo",
          },
        }),
        "Ya existe una plantilla con ese nombre en la instalación.",
      );
      await tx.plantillaPunto.createMany({
        data: input.puntos.map((p) => ({ tenantId: ctx.tenantId, plantillaId: pl.id, ...p })),
      });
      const fila = await tx.plantillaRonda.findUnique({ where: { id: pl.id }, include: incluir });
      if (!fila) throw noEncontrado("La plantilla");
      return fila;
    });
    return vistaPlantilla(creada);
  },
});

/** Edita una plantilla y, si se envían puntos, reemplaza su secuencia. */
export const plantillasActualizar = defineCapability({
  id: "rondas.plantillas.actualizar",
  descripcion:
    "Edita una plantilla de ronda: nombre, orden, tiempos máximos, umbral de incompleta y, si se envía, reemplaza la secuencia completa de puntos obligatorios u opcionales.",
  permiso: PERMISO_CONFIG,
  input: z.object({
    id: uuidSchema,
    nombre: z.string().trim().min(2).max(80).optional(),
    ordenModo: ordenSchema.optional(),
    tiempoMaxMin: z.number().int().min(5).max(480).optional(),
    tiempoMaxTramoMin: z.number().int().min(1).max(480).nullable().optional(),
    umbralIncompletaPct: z.number().int().min(0).max(100).optional(),
    permiteAdhoc: z.boolean().optional(),
    puntos: puntosSchema.optional(),
  }),
  output: plantillaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, puntos, ...cambios }, { dryRun }) {
    const plantilla = await plantillaDe(ctx, id);
    validarTramo(cambios.tiempoMaxMin ?? plantilla.tiempoMaxMin, cambios.tiempoMaxTramoMin);
    if (puntos) await puntosDeInstalacion(ctx, plantilla.instalacionId, puntos.map((p) => p.puntoId));
    const data = definidos(cambios);
    if (dryRun) {
      const fila = await ctx.db.plantillaRonda.findUnique({ where: { id }, include: incluir });
      if (!fila) throw noEncontrado("La plantilla");
      return vistaPlantilla({
        ...fila,
        ...data,
        puntos: puntos ?? fila.puntos,
      });
    }
    const actualizada = await ctx.transaccion(async (tx) => {
      await sinDuplicado(
        tx.plantillaRonda.update({ where: { id }, data }),
        "Ya existe una plantilla con ese nombre en la instalación.",
      );
      if (puntos) {
        await tx.plantillaPunto.deleteMany({ where: { plantillaId: id } });
        await tx.plantillaPunto.createMany({
          data: puntos.map((p) => ({ tenantId: ctx.tenantId, plantillaId: id, ...p })),
        });
      }
      const fila = await tx.plantillaRonda.findUnique({ where: { id }, include: incluir });
      if (!fila) throw noEncontrado("La plantilla");
      return fila;
    });
    return vistaPlantilla(actualizada);
  },
});
