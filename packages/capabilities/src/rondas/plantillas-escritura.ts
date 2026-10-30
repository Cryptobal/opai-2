import { z } from "zod";

import { defineCapability } from "../define";
import { noEncontrado } from "../errores";
import { uuidSchema } from "../core/esquemas";
import { definidos, sinDuplicado } from "../core/maestros/comun";
import { PERMISO_CONFIG, instalacionEnAlcance, ordenSchema, plantillaDe } from "./comun";
import {
  camposPlantilla,
  incluir,
  nuevos,
  puntosDeInstalacion,
  puntosSchema,
  validarTramo,
} from "./plantillas-comun";
import { plantillaSchema } from "./vistas";
import { vistaPlantilla } from "./plantillas-lectura";

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
    // Compara contra lo que quedará guardado: el total y el tramo nuevos si vienen en el input, o los
    // actuales si no. `undefined` = no se envía (usa el guardado); `null` = se borra el tramo.
    const tramo =
      cambios.tiempoMaxTramoMin !== undefined ? cambios.tiempoMaxTramoMin : plantilla.tiempoMaxTramoMin;
    validarTramo(cambios.tiempoMaxMin ?? plantilla.tiempoMaxMin, tramo);
    const data = definidos(cambios);
    if (dryRun) {
      const fila = await ctx.db.plantillaRonda.findUnique({ where: { id }, include: incluir });
      if (!fila) throw noEncontrado("La plantilla");
      if (puntos) {
        const existentes = new Set(fila.puntos.map((p) => p.puntoId));
        await puntosDeInstalacion(ctx, plantilla.instalacionId, nuevos(puntos, existentes));
      }
      return vistaPlantilla({ ...fila, ...data, puntos: puntos ?? fila.puntos });
    }
    const actualizada = await ctx.transaccion(async (tx) => {
      const dentro = { ...ctx, db: tx };
      // Bloquea la fila: la validación de puntos y la reescritura de la secuencia no deben sufrir TOCTOU.
      await tx.$queryRaw`SELECT id FROM rondas.plantillas WHERE id = ${id}::uuid AND tenant_id = ${ctx.tenantId}::uuid FOR UPDATE`;
      if (puntos) {
        const previos = await tx.plantillaPunto.findMany({
          where: { plantillaId: id },
          select: { puntoId: true },
        });
        const existentes = new Set(previos.map((p) => p.puntoId));
        // Solo los puntos NUEVOS deben estar activos y en alcance; los que ya estaban en la secuencia se
        // conservan aunque se hayan archivado (archivar no los saca de las plantillas; evita perder datos).
        await puntosDeInstalacion(dentro, plantilla.instalacionId, nuevos(puntos, existentes));
      }
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
