import { CLAVE_CATEGORIA } from "@opai/domain";
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
import { categoriasDeLaEmpresa } from "./categorias-kit";

export const tiposList = defineCapability({
  id: "inventario.tipos.list",
  descripcion:
    "Lista los tipos de inventario de la empresa (activos como teléfonos o radios, y prendas de ropa con sus tallas), ordenados por nombre. Por defecto solo los activos.",
  permiso: PERMISOS_INVENTARIO.read,
  input: z.object({
    categoria: z.string().regex(CLAVE_CATEGORIA).optional(),
    comportamiento: z.enum(["activo", "ropa"] as const).optional(),
    incluirInactivos: z.boolean().default(false),
    ...entradaLista(100),
  }),
  output: salidaLista(tipoSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { categoria, comportamiento, incluirInactivos, cursor, limite }) {
    const cats = await categoriasDeLaEmpresa(ctx);
  const filtroBase = incluirInactivos ? {} : { activo: true };
    let filtro: { activo?: boolean; categoria?: string | { in: string[] } } = {
      ...filtroBase,
      ...(categoria ? { categoria } : {}),
    };
    if (comportamiento && !categoria) {
      const claves = cats.filter((c) => c.comportamiento === comportamiento).map((c) => c.clave);
      filtro = { ...filtroBase, categoria: { in: claves.length ? claves : [comportamiento] } };
    }
    const { items, siguiente } = await tiposPorNombre(ctx, filtro, cursor, limite);
    return { items: items.map((f) => vistaTipo(f, cats)), siguiente };
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
    return vistaTipo(f, await categoriasDeLaEmpresa(ctx));
  },
});
