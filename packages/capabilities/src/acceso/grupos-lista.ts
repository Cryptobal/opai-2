import { z } from "zod";

import { instalacionEnAlcance } from "../rondas/comun";
import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { reglaDeNegocio } from "../errores";
import { PERMISO_READ } from "./comun";
import { PERMISO_CONFIG } from "./config-comun";

const grupoSchema = z.object({
  id: uuidSchema,
  nombre: z.string(),
  instalacionIds: z.array(uuidSchema),
});

export const gruposListar = defineCapability({
  id: "acceso.grupos.list",
  descripcion:
    "Lista los grupos de instalaciones que comparten listas de acceso: nombre y qué instalaciones incluye cada uno.",
  permiso: PERMISO_READ,
  input: z.object({}),
  output: z.array(grupoSchema),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (items) => items.map((g) => g.id),
  async handler(ctx) {
    const filas = await ctx.db.grupoLista.findMany({
      orderBy: { nombre: "asc" },
      include: { miembros: { select: { instalacionId: true } } },
    });
    return filas.map((g) => ({
      id: g.id,
      nombre: g.nombre,
      instalacionIds: g.miembros.map((m) => m.instalacionId),
    }));
  },
});

const grupoEntrada = z.object({
  id: uuidSchema.optional(),
  nombre: z.string().trim().min(2).max(80),
  instalacionIds: z.array(uuidSchema).min(1).max(50),
});

export const gruposCambiar = defineCapability({
  id: "acceso.grupos.set",
  descripcion:
    "Define los grupos de instalaciones que comparten listas: crea los nuevos, renombra y reasigna miembros a los que traen `id`, y deja de listar un grupo existente para eliminarlo. Un agente necesita aprobación humana.",
  permiso: PERMISO_CONFIG,
  input: z.object({ grupos: z.array(grupoEntrada).max(30) }),
  output: z.array(grupoSchema),
  efecto: "escritura",
  dryRun: true,
  exigeAprobacion: () => true,
  async handler(ctx, { grupos }, { dryRun }) {
    for (const ids of grupos.map((g) => g.instalacionIds)) {
      for (const instalacionId of ids) await instalacionEnAlcance(ctx, instalacionId);
    }
    const nombres = new Set(grupos.map((g) => g.nombre.toLowerCase()));
    if (nombres.size !== grupos.length)
      throw reglaDeNegocio("Hay dos grupos con el mismo nombre.");
    const actuales = await ctx.db.grupoLista.findMany({ select: { id: true } });
    const idsEntrada = new Set(grupos.map((g) => g.id).filter(Boolean) as string[]);
    const borrar = actuales.filter((a) => !idsEntrada.has(a.id));
    if (
      borrar.length > 0 &&
      (await ctx.db.entradaLista.count({ where: { grupoId: { in: borrar.map((b) => b.id) } } })) > 0
    )
      throw reglaDeNegocio("No se puede quitar un grupo que tiene entradas de lista.");
    if (dryRun) {
      return grupos.map((g) => ({
        id: g.id ?? "00000000-0000-0000-0000-000000000000",
        nombre: g.nombre,
        instalacionIds: g.instalacionIds,
      }));
    }
    for (const g of grupos) {
      if (g.id) {
        await ctx.db.grupoLista.update({ where: { id: g.id }, data: { nombre: g.nombre } });
        await ctx.db.grupoListaInstalacion.deleteMany({ where: { grupoId: g.id } });
        await ctx.db.grupoListaInstalacion.createMany({
          data: g.instalacionIds.map((instalacionId) => ({
            tenantId: ctx.tenantId,
            grupoId: g.id!,
            instalacionId,
          })),
        });
      } else {
        const c = await ctx.db.grupoLista.create({
          data: { tenantId: ctx.tenantId, nombre: g.nombre },
        });
        await ctx.db.grupoListaInstalacion.createMany({
          data: g.instalacionIds.map((instalacionId) => ({
            tenantId: ctx.tenantId,
            grupoId: c.id,
            instalacionId,
          })),
        });
      }
    }
    for (const b of borrar) await ctx.db.grupoLista.delete({ where: { id: b.id } });
    const filas = await ctx.db.grupoLista.findMany({
      orderBy: { nombre: "asc" },
      include: { miembros: { select: { instalacionId: true } } },
    });
    return filas.map((g) => ({
      id: g.id,
      nombre: g.nombre,
      instalacionIds: g.miembros.map((m) => m.instalacionId),
    }));
  },
});