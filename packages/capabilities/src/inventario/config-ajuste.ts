// Helpers compartidos para capacidades de configuración de inventario (CAR-743).
import {
  CLAVE_CATEGORIA,
  CLAVE_PRENDA,
  COMPORTAMIENTOS_CATEGORIA,
  LIMITES_CATEGORIA,
  LIMITES_PRENDAS,
} from "@opai/domain";
import { z } from "zod";

import { campoAjuste } from "../core/config";
import { type ajuste } from "../core/config";
import { reglaDeNegocio } from "../errores";

export const prendaEntrada = z.object({
  clave: z.string().regex(CLAVE_PRENDA).optional(),
  nombre: z.string().trim().min(LIMITES_PRENDAS.nombreMin).max(LIMITES_PRENDAS.nombreMax),
  activo: z.boolean().default(true),
  orden: z.number().int().min(0).max(99).optional(),
});

export const categoriaEntrada = z.object({
  clave: z.string().regex(CLAVE_CATEGORIA).optional(),
  nombre: z.string().trim().min(LIMITES_CATEGORIA.nombreMin).max(LIMITES_CATEGORIA.nombreMax),
  comportamiento: z.enum(COMPORTAMIENTOS_CATEGORIA),
  activo: z.boolean().default(true),
  orden: z.number().int().min(0).max(99).optional(),
});

export async function guardarAjuste(
  ctx: Parameters<typeof ajuste>[0],
  modulo: string,
  clave: string,
  valor: unknown,
) {
  const c = campoAjuste(modulo, clave);
  if (!c) throw reglaDeNegocio(`Ajuste ${modulo}.${clave} no existe.`);
  const r = c.schema.safeParse(valor);
  if (!r.success) throw reglaDeNegocio(r.error.issues[0]?.message ?? "Valor inválido.");
  const parsed = r.data as object;
  return ctx.transaccion(async (tx) => {
    const claveDb = {
      tenantId: ctx.tenantId,
      ambito: "tenant" as const,
      sujetoId: ctx.tenantId,
      modulo,
      clave,
    };
    await tx.ajuste.upsert({
      where: { tenantId_ambito_sujetoId_modulo_clave: claveDb },
      create: { ...claveDb, valor: parsed, actualizadoPor: ctx.usuario?.id ?? null },
      update: { valor: parsed, actualizadoPor: ctx.usuario?.id ?? null, version: { increment: 1 } },
    });
    await ctx.eventos.emitir(tx, {
      tipo: "core.config.cambiada",
      entidadTipo: "ajuste",
      payload: { modulo, clave, ambito: "tenant", version: 0 },
    });
    return parsed;
  });
}