import { z } from "zod";

import {
  type CentroCostoRef,
  NOMBRE_CENTRO_GENERAL,
  type TipoDteCompra,
} from "@opai/domain";

import { ajuste } from "../core/config";
import { uuidSchema } from "../core/esquemas";
import { noEncontrado } from "../errores";
import type { Contexto } from "../types";

export const PERMISO_READ = "finanzas:read";
export const PERMISO_PLAN = "finanzas:plan.manage";
export const PERMISO_PROVEEDORES = "finanzas:proveedores.manage";
export const PERMISO_COMPRAS = "finanzas:compras.manage";

/** Plazo de pago de un proveedor nuevo si no se indica; igual al `.default()` del ajuste (ADR-021). */
export const PLAZO_PAGO_DEFECTO = 30;

export async function plazoPagoDefecto(ctx: Contexto): Promise<number> {
  try {
    return (await ajuste<number>(ctx, "finanzas", "plazo_pago_defecto_dias")) ?? PLAZO_PAGO_DEFECTO;
  } catch {
    return PLAZO_PAGO_DEFECTO;
  }
}

export const centroRefSchema = z
  .discriminatedUnion("tipo", [
    z.object({ tipo: z.literal("instalacion"), instalacionId: uuidSchema }),
    z.object({ tipo: z.literal("general") }),
  ])
  .describe(
    'Centro de costo: una instalación ({"tipo":"instalacion","instalacionId":…}) o el general «Administración / Oficina central» ({"tipo":"general"}).',
  );

export type CentroDestino = { id: string | null; nombre: string; ref: CentroCostoRef };

/**
 * Resuelve el centro de costo que pide `ref`. Con `crear` lo crea si aún no existe (primera vez que
 * se usa); sin `crear` (dryRun, lecturas) devuelve `id: null` en ese caso. Una instalación ajena o
 * inexistente responde NOT_FOUND. `createMany` con `skipDuplicates` evita abortar la transacción si
 * dos escrituras crean el mismo centro a la vez.
 */
export async function centroDe(ctx: Contexto, ref: CentroCostoRef, crear: boolean): Promise<CentroDestino> {
  const donde =
    ref.tipo === "general"
      ? { tipo: "general" }
      : { tipo: "instalacion", instalacionId: ref.instalacionId };
  let nombre = NOMBRE_CENTRO_GENERAL;
  if (ref.tipo === "instalacion") {
    const inst = await ctx.db.instalacion.findFirst({
      where: { id: ref.instalacionId },
      select: { nombre: true },
    });
    if (!inst) throw noEncontrado("La instalación");
    nombre = inst.nombre;
  }
  const existente = await ctx.db.centroCosto.findFirst({ where: donde, select: { id: true } });
  if (existente) return { id: existente.id, nombre, ref };
  if (!crear) return { id: null, nombre, ref };
  await ctx.db.centroCosto.createMany({
    data: [
      {
        tenantId: ctx.tenantId,
        tipo: ref.tipo,
        instalacionId: ref.tipo === "instalacion" ? ref.instalacionId : null,
        nombre,
      },
    ],
    skipDuplicates: true,
  });
  const creado = await ctx.db.centroCosto.findFirst({ where: donde, select: { id: true } });
  return { id: creado?.id ?? null, nombre, ref };
}

export async function cuentaDe(ctx: Contexto, id: string) {
  const c = await ctx.db.cuentaContable.findFirst({ where: { id } });
  if (!c) throw noEncontrado("La cuenta contable");
  return c;
}

export async function proveedorDe(ctx: Contexto, id: string) {
  const p = await ctx.db.proveedor.findFirst({ where: { id } });
  if (!p) throw noEncontrado("El proveedor");
  return p;
}

export const tipoDteSchema = z
  .union([z.literal(33), z.literal(34), z.literal(56), z.literal(61)])
  .describe("Tipo de DTE: 33 factura, 34 factura exenta, 56 nota de débito, 61 nota de crédito.");

export const montoSchema = z.number().int().min(0).max(2_000_000_000);

export type { TipoDteCompra };
