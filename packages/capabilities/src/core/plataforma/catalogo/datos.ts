import { z } from "zod";

import {
  ENTRADAS_CATALOGO,
  entradaCatalogo,
  type PrecioLista,
  textoPrecioLista,
} from "@opai/domain";

import type { Plataforma } from "../../../types";
import { formaSchema, monedaSchema, unidadSchema } from "../cobros/esquemas";

/**
 * Precio de lista por cobrable (CAR-204): una fila por id en `core.ajustes_plataforma` (módulo
 * «catalogo», clave = id). Ya viene versionado (`version`) y cada cambio queda en la auditoría global
 * con antes y después (ADR-021): configuración, nunca código por empresa. No hay tabla nueva.
 */
export const MODULO_AJUSTE_CATALOGO = "catalogo";

export const precioListaSchema = z.object({
  moneda: monedaSchema,
  forma: formaSchema,
  unidad: unidadSchema.nullable(),
  precio: z.number().int().min(0).describe("Pesos (CLP) o UF × 10.000."),
  minimoMensual: z.number().int().min(0).nullable(),
});

export type PrecioListaGuardado = { precio: PrecioLista; version: number };

/** Precios de lista guardados, por id; ignora lo que no valida (nunca rompe la lista). */
export async function preciosDeLista(
  p: Pick<Plataforma, "globales">,
): Promise<Map<string, PrecioListaGuardado>> {
  const salida = new Map<string, PrecioListaGuardado>();
  for (const f of await p.globales.listarAjustes()) {
    if (f.modulo !== MODULO_AJUSTE_CATALOGO || !entradaCatalogo(f.clave)) continue;
    const r = precioListaSchema.safeParse(f.valor);
    if (r.success) salida.set(f.clave, { precio: r.data, version: f.version });
  }
  return salida;
}

export const textoDe = (p: PrecioLista | null) => (p ? textoPrecioLista(p) : null);

/** Nombres de las dependencias de una entrada, para mostrarlas («Bancos», «Ventas o Compras»). */
export const dependenciasTexto = (id: string): string[] =>
  (entradaCatalogo(id)?.dependencias ?? []).map((alt) =>
    alt.map((x) => ENTRADAS_CATALOGO.find((e) => e.id === x)?.nombre ?? x).join(" o "),
  );
