// Kit de categorías y prendas del uniforme (CAR-743): lectura del ajuste con respaldo al defecto.
import {
  categoriasEfectivas,
  comportamientoDe,
  prendasConfiguracion,
  prendasEfectivas,
  prendasValidas,
  type CategoriaInventario,
  type ComportamientoCategoria,
} from "@opai/domain";

import type { Contexto } from "../types";
import { ajuste } from "../core/config";
import { reglaDeNegocio } from "../errores";

export async function categoriasDeLaEmpresa(ctx: Contexto): Promise<CategoriaInventario[]> {
  const propio = await ajuste<unknown>(ctx, "inventario", "inventario_categorias");
  return categoriasEfectivas(propio);
}

export async function comportamientoDeCategoria(
  ctx: Contexto,
  clave: string,
): Promise<ComportamientoCategoria | null> {
  return comportamientoDe(clave, await categoriasDeLaEmpresa(ctx));
}

export async function exigirCategoriaActiva(ctx: Contexto, clave: string) {
  const cats = await categoriasDeLaEmpresa(ctx);
  const c = cats.find((x) => x.clave === clave);
  if (!c) throw reglaDeNegocio(`La categoría «${clave}» no existe en tu empresa.`);
  if (!c.activo) throw reglaDeNegocio(`La categoría «${c.nombre}» está inactiva.`);
  return c;
}

export async function prendasKitConfiguracion(ctx: Contexto) {
  const [tenant, propio] = await Promise.all([
    ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { vertical: true } }),
    ajuste<unknown>(ctx, "core", "personas_prendas_uniforme"),
  ]);
  const vertical = tenant?.vertical ?? "";
  const guardado = prendasValidas(propio);
  return {
    vertical,
    heredaRubro: !guardado?.length,
    prendas: prendasConfiguracion(propio, vertical),
    activas: prendasEfectivas(propio, vertical),
  };
}