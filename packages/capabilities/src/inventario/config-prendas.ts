// Prendas del uniforme (ajuste core.personas_prendas_uniforme) — CAR-743.
import { LIMITES_PRENDAS, prendasNormalizadas, type Prenda } from "@opai/domain";
import { z } from "zod";

import { ajuste } from "../core/config";
import { defineCapability } from "../define";
import { prohibido, reglaDeNegocio } from "../errores";
import { PERMISOS_INVENTARIO } from "./comun";
import { prendasKitConfiguracion } from "./categorias-kit";
import { guardarAjuste, prendaEntrada } from "./config-ajuste";

export const configPrendasList = defineCapability({
  id: "inventario.config.prendas_list",
  descripcion: "Lista las prendas del uniforme configuradas por la empresa (incluye inactivas y el respaldo del rubro).",
  permiso: PERMISOS_INVENTARIO.tiposManage,
  input: z.object({}),
  output: z.object({
    heredaRubro: z.boolean(),
    items: z.array(
      z.object({
        clave: z.string(),
        nombre: z.string(),
        activo: z.boolean(),
        orden: z.number(),
        enUso: z.boolean(),
      }),
    ),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const kit = await prendasKitConfiguracion(ctx);
    const usadas = new Set(
      (
        await ctx.db.personaTalla.findMany({
          where: { tenantId: ctx.tenantId },
          select: { prenda: true },
          distinct: ["prenda"],
        })
      ).map((r) => r.prenda),
    );
    const ligadas = new Set(
      (
        await ctx.db.inventarioTipo.findMany({
          where: { tenantId: ctx.tenantId, prendaClave: { not: null } },
          select: { prendaClave: true },
        })
      ).map((r) => r.prendaClave!),
    );
    return {
      heredaRubro: kit.heredaRubro,
      items: kit.prendas.map((p, i) => ({
        clave: p.clave,
        nombre: p.nombre,
        activo: p.activo !== false,
        orden: p.orden ?? i,
        enUso: usadas.has(p.clave) || ligadas.has(p.clave),
      })),
    };
  },
});

export const configPrendasGuardar = defineCapability({
  id: "inventario.config.prendas_guardar",
  descripcion:
    "Guarda el catálogo de prendas del uniforme. La clave se conserva al renombrar; el orden define la lista en la ficha.",
  permiso: PERMISOS_INVENTARIO.tiposManage,
  input: z.object({
    heredaRubro: z.literal(false).optional(),
    prendas: z.array(prendaEntrada).max(LIMITES_PRENDAS.prendas),
  }),
  output: z.array(
    z.object({ clave: z.string(), nombre: z.string(), activo: z.boolean(), orden: z.number() }),
  ),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (ctx.actor.tipo === "agent") throw prohibido("Las prendas del uniforme las cambia una persona.");
    const previo = await ajuste<unknown>(ctx, "core", "personas_prendas_uniforme");
    const valor = input.prendas.length
      ? prendasNormalizadas(
          input.prendas.map((p) => ({
            nombre: p.nombre,
            activo: p.activo,
            ...(p.clave ? { clave: p.clave } : {}),
            ...(p.orden !== undefined ? { orden: p.orden } : {}),
          })),
          Array.isArray(previo) ? (previo as Prenda[]) : [],
        )
      : [];
    if (input.prendas.length && !valor) throw reglaDeNegocio("La lista de prendas no es válida.");
    const guardado = input.prendas.length ? valor! : [];
    if (dryRun) return guardado.map((p, i) => ({ ...p, orden: p.orden ?? i, activo: p.activo !== false }));
    return guardarAjuste(ctx, "core", "personas_prendas_uniforme", guardado) as Promise<
      { clave: string; nombre: string; activo: boolean; orden: number }[]
    >;
  },
});