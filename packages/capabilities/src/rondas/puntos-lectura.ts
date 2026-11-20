import { z } from "zod";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { cursorDe, limiteLista, listaSchema, pagina } from "../core/maestros/comun";
import { PERMISO_READ, dondeInstalacionId, instalacionEnAlcance } from "./comun";
import { puntoSchema, vistaPunto } from "./vistas";

/** Lista los puntos de control de una instalación (pestaña Rondas de la ficha de instalación). */
export const puntosListar = defineCapability({
  id: "rondas.puntos.listar",
  descripcion:
    "Lista los puntos de control de una instalación, con su modo (QR, GPS o QR + GPS), coordenadas, radio, precisión mínima, permanencia y estado activo o archivado.",
  permiso: PERMISO_READ,
  input: z.object({
    instalacionId: uuidSchema,
    incluirArchivados: z.boolean().default(false),
    cursor: listaSchema.shape.cursor,
    limite: limiteLista,
  }),
  output: z.object({ items: z.array(puntoSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    await instalacionEnAlcance(ctx, input.instalacionId);
    const puntos = await ctx.db.puntoControl.findMany({
      where: {
        // `instalacionId` y el alcance van en `AND`: el spread de `dondeInstalacionId` pisaría el
        // `instalacionId` pedido y listaría puntos de todas las instalaciones del alcance.
        AND: [{ instalacionId: input.instalacionId }, dondeInstalacionId(ctx)],
        ...(input.incluirArchivados ? {} : { estado: "activo" }),
      },
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
      ...cursorDe(input.cursor, input.limite),
    });
    const { items, siguiente } = pagina(puntos, input.limite, input.cursor);
    return { items: items.map(vistaPunto), siguiente };
  },
});
