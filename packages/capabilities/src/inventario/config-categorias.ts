// Categorías de tipos de inventario (ajuste inventario.inventario_categorias) — CAR-743.
import { categoriasNormalizadas, LIMITES_CATEGORIA, type CategoriaInventario } from "@opai/domain";
import { z } from "zod";

import { ajuste } from "../core/config";
import { defineCapability } from "../define";
import { reglaDeNegocio } from "../errores";
import { entradaLista, paginaPor, PERMISOS_INVENTARIO, salidaLista } from "./comun";
import { categoriasDeLaEmpresa } from "./categorias-kit";
import { categoriaEntrada, guardarAjuste } from "./config-ajuste";

export const configCategoriasList = defineCapability({
  id: "inventario.config.categorias_list",
  descripcion: "Lista las categorías de tipos de inventario de la empresa.",
  permiso: PERMISOS_INVENTARIO.tiposManage,
  input: z.object({ incluirInactivas: z.boolean().default(true), ...entradaLista(50) }),
  output: salidaLista(z.custom<CategoriaInventario>()),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { incluirInactivas, cursor, limite }) {
    const items = await categoriasDeLaEmpresa(ctx);
    const filas = incluirInactivas ? items : items.filter((c) => c.activo);
    const desde = cursor ? filas.findIndex((c) => c.clave === cursor) + 1 : 0;
    return paginaPor(filas.slice(desde < 0 ? 0 : desde), limite, (c) => c.clave);
  },
});

export const configCategoriasGuardar = defineCapability({
  id: "inventario.config.categorias_guardar",
  descripcion: "Guarda las categorías de tipos de inventario; la clave es estable al renombrar.",
  permiso: PERMISOS_INVENTARIO.tiposManage,
  input: z.object({ categorias: z.array(categoriaEntrada).max(LIMITES_CATEGORIA.max) }),
  output: z.array(z.custom<CategoriaInventario>()),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const previo = await ajuste<unknown>(ctx, "inventario", "inventario_categorias");
    const valor = input.categorias.length
      ? categoriasNormalizadas(
          input.categorias.map((c) => ({
            nombre: c.nombre,
            comportamiento: c.comportamiento,
            activo: c.activo,
            ...(c.clave ? { clave: c.clave } : {}),
            ...(c.orden !== undefined ? { orden: c.orden } : {}),
          })),
          Array.isArray(previo) ? (previo as CategoriaInventario[]) : [],
        )
      : [];
    if (input.categorias.length && !valor) throw reglaDeNegocio("La lista de categorías no es válida.");
    const guardado = input.categorias.length ? valor! : [];
    if (dryRun) return guardado;
    return guardarAjuste(ctx, "inventario", "inventario_categorias", guardado) as Promise<CategoriaInventario[]>;
  },
});