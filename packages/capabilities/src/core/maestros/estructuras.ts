import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import { uuidSchema } from "../esquemas";
import { itemsDe, ocultarMontos } from "./estructuras-acceso";
import { estructuraSchema, NIVELES, vistaEstructura } from "./estructuras-vista";

export const estructurasList = defineCapability({
  id: "core.estructuras.list",
  descripcion:
    "Versiones de estructura de sueldo de un cargo, puesto o persona (de la más reciente a la más antigua). Si el cargo es sensible y no tienes ese permiso, los montos vienen vacíos y sensible = true.",
  permiso: PERMISOS_CORE.estructurasRead,
  input: z.object({
    nivel: z.enum(NIVELES),
    refId: uuidSchema.describe("Id del cargo, puesto o persona según el nivel."),
    incluirAnuladas: z.boolean().default(false),
  }),
  output: z.array(estructuraSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const campo = `${input.nivel}Id` as const;
    const filas = await ctx.db.estructuraSueldo.findMany({
      where: {
        nivel: input.nivel,
        [campo]: input.refId,
        ...(input.incluirAnuladas ? {} : { estado: "vigente" }),
      },
      orderBy: { vigenteDesde: "desc" },
    });
    const items = await itemsDe(
      ctx,
      filas.map((f) => f.id),
    );
    return Promise.all(
      filas.map(async (f) =>
        vistaEstructura(f, items.get(f.id) ?? [], await ocultarMontos(ctx, f)),
      ),
    );
  },
});

export const estructurasGet = defineCapability({
  id: "core.estructuras.get",
  descripcion:
    "Una versión de estructura de sueldo con sus ítems (bonos fijos y porcentuales). Respeta la sensibilidad del cargo.",
  permiso: PERMISOS_CORE.estructurasRead,
  input: z.object({ id: uuidSchema }),
  output: estructuraSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const e = await ctx.db.estructuraSueldo.findUnique({ where: { id: input.id } });
    if (!e) throw noEncontrado("La estructura");
    const items = await itemsDe(ctx, [e.id]);
    return vistaEstructura(e, items.get(e.id) ?? [], await ocultarMontos(ctx, e));
  },
});
