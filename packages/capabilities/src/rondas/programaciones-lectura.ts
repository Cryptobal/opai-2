import { z } from "zod";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { PERMISO_READ, dondeInstalacionId, instalacionEnAlcance } from "./comun";
import { programacionSchema, vistaProgramacion } from "./vistas";

/** Lista las programaciones de una instalación (cuándo se hace cada plantilla y a quién se asigna). */
export const programacionesListar = defineCapability({
  id: "rondas.programaciones.listar",
  descripcion:
    "Lista las programaciones de ronda de una instalación: qué plantilla, en qué horarios y días, con qué tolerancia, a quién se asigna y si está activa o pausada.",
  permiso: PERMISO_READ,
  input: z.object({ instalacionId: uuidSchema }),
  output: z.array(programacionSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    await instalacionEnAlcance(ctx, input.instalacionId);
    const filas = await ctx.db.programacion.findMany({
      where: { instalacionId: input.instalacionId, ...dondeInstalacionId(ctx) },
      orderBy: { nombre: "asc" },
    });
    return filas.map(vistaProgramacion);
  },
});
