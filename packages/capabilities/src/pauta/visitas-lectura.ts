import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { noEncontrado } from "../errores";
import { PERMISO_READ } from "./comun";
import { dondeVisita, type Visita, visitaSchema, vistasDeVisitas } from "./visitas-comun";

/** Visitas de supervisión, de la más reciente a la más antigua (CAR-83). Contrato de listas (CAR-353). */
export const visitasListar = defineCapability({
  // Las observaciones son texto libre del supervisor: se audita qué visitas se revelaron (solo IDs).
  auditarLectura: (s) => s.items.map((v) => v.id),
  id: "pauta.visitas.listar",
  descripcion:
    "Lista las visitas de supervisión, de la más reciente a la más antigua, con su instalación, supervisor, si la llegada quedó dentro de la geocerca y la lista de revisión. Se puede filtrar por instalación, supervisor o estado. Solo instalaciones dentro del alcance de quien consulta.",
  permiso: PERMISO_READ,
  input: z.object({
    instalacionId: uuidSchema.optional(),
    supervisorId: uuidSchema.optional(),
    estado: visitaSchema.shape.estado.optional(),
    cursor: z.string().optional().describe("El `siguiente` de la página anterior."),
    limite: z.number().int().min(1).max(100).default(20),
  }),
  output: z.object({ items: z.array(visitaSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { instalacionId, supervisorId, estado, cursor, limite }) {
    const filas = await ctx.db.visitaSupervision.findMany({
      where: {
        AND: [dondeVisita(ctx)],
        ...(instalacionId ? { instalacionId } : {}),
        ...(supervisorId ? { supervisorId } : {}),
        ...(estado ? { estado } : {}),
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      orderBy: { id: "desc" },
      take: limite + 1,
    });
    const pagina = filas.slice(0, limite);
    return { items: await vistasDeVisitas(ctx, pagina), siguiente: filas.length > limite ? (pagina.at(-1)?.id ?? null) : null };
  },
});

/** Una visita de supervisión con su detalle (CAR-83). */
export const visitasObtener = defineCapability({
  auditarLectura: (s) => [s.id],
  id: "pauta.visitas.obtener",
  descripcion:
    "Muestra una visita de supervisión: instalación, supervisor, hora de llegada y cierre, distancia a la instalación, lista de revisión y observaciones. Solo si la instalación está dentro del alcance de quien consulta.",
  permiso: PERMISO_READ,
  input: z.object({ visitaId: uuidSchema }),
  output: visitaSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { visitaId }) {
    const v = await ctx.db.visitaSupervision.findFirst({ where: { AND: [dondeVisita(ctx)], id: visitaId } });
    if (!v) throw noEncontrado("La visita");
    return (await vistasDeVisitas(ctx, [v]))[0] as Visita;
  },
});
