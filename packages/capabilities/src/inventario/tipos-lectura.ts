import { CATEGORIAS_TIPO } from "@opai/domain";
import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { noEncontrado } from "../errores";
import {
  entradaLista,
  PERMISOS_INVENTARIO,
  salidaLista,
  tipoSchema,
  tiposPorNombre,
  vistaTipo,
} from "./comun";

export const tiposList = defineCapability({
  id: "inventario.tipos.list",
  descripcion:
    "Lista los tipos de inventario de la empresa (activos como teléfonos o radios, y prendas de ropa con sus tallas), ordenados por nombre. Por defecto solo los activos.",
  permiso: PERMISOS_INVENTARIO.read,
  input: z.object({
    categoria: z.enum(CATEGORIAS_TIPO).optional(),
    incluirInactivos: z.boolean().default(false),
    ...entradaLista(100),
  }),
  output: salidaLista(tipoSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { categoria, incluirInactivos, cursor, limite }) {
    const filtro = {
      ...(categoria ? { categoria } : {}),
      ...(incluirInactivos ? {} : { activo: true }),
    };
    const { items, siguiente } = await tiposPorNombre(ctx, filtro, cursor, limite);
    return { items: items.map(vistaTipo), siguiente };
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
