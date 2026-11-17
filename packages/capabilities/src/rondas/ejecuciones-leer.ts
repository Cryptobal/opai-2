import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { noEncontrado } from "../errores";
import { dondeInstalacionId, PERMISO_READ } from "./comun";
import { ejecucionDetalleSchema, seleccionEjecucionNucleo } from "./ejecuciones-comun";
import { mapearEjecucionDetalle } from "./ejecuciones-leer-mapear";

/** Detalle de una ronda con sus marcas y anomalías por punto. */
export const ejecucionesLeer = defineCapability({
  id: "rondas.ejecuciones.leer",
  descripcion:
    "Lee una ronda realizada con el detalle de cada punto marcado, la geocerca y las anomalías detectadas en la marca.",
  permiso: PERMISO_READ,
  input: z.object({ id: uuidSchema }),
  output: ejecucionDetalleSchema,
  auditarLectura: (s) => [s.id],
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { id }) {
    const e = await ctx.db.ejecucionRonda.findFirst({
      where: { id, ...dondeInstalacionId(ctx) },
      select: {
        ...seleccionEjecucionNucleo,
        marcas: {
          orderBy: { horaCorregida: "asc" },
          select: { id: true, puntoId: true, horaCorregida: true, geocerca: true, anomalias: true },
        },
      },
    });
    if (!e) throw noEncontrado("La ronda");
    const puntoIds = [...new Set(e.marcas.map((m) => m.puntoId))];
    const puntos = puntoIds.length
      ? await ctx.db.puntoControl.findMany({
          where: { id: { in: puntoIds }, ...dondeInstalacionId(ctx) },
          select: { id: true, nombre: true },
        })
      : [];
    const nombres = new Map(puntos.map((p) => [p.id, p.nombre]));
    return mapearEjecucionDetalle(e, nombres, new Date());
  },
});