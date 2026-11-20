import { z } from "zod";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { cursorDe, limiteLista, listaSchema, pagina } from "../core/maestros/comun";
import { PERMISO_READ, dondeInstalacionId, instalacionEnAlcance } from "./comun";
import { programacionSchema, vistaProgramacion } from "./vistas";

/** Lista las programaciones de una instalación (cuándo se hace cada plantilla y a quién se asigna). */
export const programacionesListar = defineCapability({
  id: "rondas.programaciones.listar",
  descripcion:
    "Lista las programaciones de ronda de una instalación: qué plantilla, en qué horarios y días, con qué tolerancia, a quién se asigna y si está activa o pausada.",
  permiso: PERMISO_READ,
  input: z.object({
    instalacionId: uuidSchema,
    cursor: listaSchema.shape.cursor,
    limite: limiteLista,
  }),
  output: z.object({ items: z.array(programacionSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    await instalacionEnAlcance(ctx, input.instalacionId);
    const filas = await ctx.db.programacion.findMany({
      // `instalacionId` y el alcance van en `AND`: el spread de `dondeInstalacionId` pisaría el
      // `instalacionId` pedido y listaría programaciones de todas las instalaciones del alcance.
      where: { AND: [{ instalacionId: input.instalacionId }, dondeInstalacionId(ctx)] },
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
      ...cursorDe(input.cursor, input.limite),
    });
    const { items, siguiente } = pagina(filas, input.limite, input.cursor);
    return { items: items.map(vistaProgramacion), siguiente };
  },
});
