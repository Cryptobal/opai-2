import { CATEGORIAS_TIPO } from "@opai/domain";
import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { noEncontrado } from "../errores";
import { PERMISOS_INVENTARIO, tipoSchema, vistaTipo } from "./comun";

export const tiposList = defineCapability({
  id: "inventario.tipos.list",
  descripcion:
    "Lista los tipos de inventario de la empresa (activos como teléfonos o radios, y prendas de ropa con sus tallas), ordenados por nombre. Por defecto solo los activos.",
  permiso: PERMISOS_INVENTARIO.read,
  input: z.object({
    categoria: z.enum(CATEGORIAS_TIPO).optional(),
    incluirInactivos: z.boolean().default(false),
    cursor: z.string().optional().describe("El `siguiente` de la página anterior."),
    limite: z.number().int().min(1).max(200).default(100),
  }),
  output: z.object({ items: z.array(tipoSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { categoria, incluirInactivos, cursor, limite }) {
    const filas = await ctx.db.inventarioTipo.findMany({
      where: {
        ...(categoria ? { categoria } : {}),
        ...(incluirInactivos ? {} : { activo: true }),
        ...(cursor ? { nombreNormalizado: { gt: cursor } } : {}),
      },
      orderBy: { nombreNormalizado: "asc" },
      take: limite + 1,
    });
    const pagina = filas.slice(0, limite);
    return {
      items: pagina.map(vistaTipo),
      siguiente: filas.length > limite ? (pagina.at(-1)?.nombreNormalizado ?? null) : null,
    };
  },
});

export const tiposGet = defineCapability({
  id: "inventario.tipos.get",
  descripcion:
    "Muestra un tipo de inventario de la empresa: su categoría, sus campos propios (si es un activo) o sus tallas y la prenda del uniforme (si es ropa).",
  permiso: PERMISOS_INVENTARIO.read,
  input: z.object({ id: uuidSchema }),
  output: tipoSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { id }) {
    const f = await ctx.db.inventarioTipo.findFirst({ where: { id } });
    if (!f) throw noEncontrado("El tipo de inventario");
    return vistaTipo(f);
  },
});
