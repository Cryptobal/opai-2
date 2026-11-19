import { z } from "zod";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { cursorDe, limiteLista, listaSchema, pagina } from "../core/maestros/comun";
import { PERMISO_READ, dondeInstalacionId, instalacionEnAlcance } from "./comun";
import type { ordenSchema } from "./comun";
import { plantillaSchema } from "./vistas";

type FilaPlantilla = {
  id: string;
  instalacionId: string;
  nombre: string;
  ordenModo: string;
  tiempoMaxMin: number;
  tiempoMaxTramoMin: number | null;
  umbralIncompletaPct: number;
  permiteAdhoc: boolean;
  estado: string;
  puntos: { puntoId: string; orden: number; obligatorio: boolean }[];
};

export function vistaPlantilla(p: FilaPlantilla): z.input<typeof plantillaSchema> {
  return {
    id: p.id,
    instalacionId: p.instalacionId,
    nombre: p.nombre,
    ordenModo: p.ordenModo as z.infer<typeof ordenSchema>,
    tiempoMaxMin: p.tiempoMaxMin,
    tiempoMaxTramoMin: p.tiempoMaxTramoMin,
    umbralIncompletaPct: p.umbralIncompletaPct,
    permiteAdhoc: p.permiteAdhoc,
    estado: (p.estado === "archivado" ? "archivado" : "activo") as "activo" | "archivado",
    puntos: p.puntos.map((x) => ({ puntoId: x.puntoId, orden: x.orden, obligatorio: x.obligatorio })),
  };
}

const incluirPuntos = {
  puntos: { orderBy: { orden: "asc" }, select: { puntoId: true, orden: true, obligatorio: true } },
} as const;

/** Lista las plantillas de ronda de una instalación con su secuencia de puntos. */
export const plantillasListar = defineCapability({
  id: "rondas.plantillas.listar",
  descripcion:
    "Lista las plantillas de ronda de una instalación con su orden (sugerido, estricto o aleatorio), tiempos máximos, umbral de incompleta y la secuencia de puntos obligatorios u opcionales.",
  permiso: PERMISO_READ,
  input: z.object({
    instalacionId: uuidSchema,
    incluirArchivadas: z.boolean().default(false),
    cursor: listaSchema.shape.cursor,
    limite: limiteLista,
  }),
  output: z.object({ items: z.array(plantillaSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    await instalacionEnAlcance(ctx, input.instalacionId);
    const plantillas = await ctx.db.plantillaRonda.findMany({
      where: {
        // `instalacionId` y el alcance van en `AND`: el spread de `dondeInstalacionId` pisaría el
        // `instalacionId` pedido y listaría plantillas de todas las instalaciones del alcance.
        AND: [{ instalacionId: input.instalacionId }, dondeInstalacionId(ctx)],
        ...(input.incluirArchivadas ? {} : { estado: "activo" }),
      },
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
      include: incluirPuntos,
      ...cursorDe(input.cursor, input.limite),
    });
    const { items, siguiente } = pagina(plantillas, input.limite, input.cursor);
    return { items: items.map(vistaPlantilla), siguiente };
  },
});
