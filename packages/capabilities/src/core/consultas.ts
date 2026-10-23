import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";
import type { TenantDb } from "@opai/db";

import { defineCapability } from "../define";
import { listarModulos } from "../module";

export const moduloEstadoSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  version: z.string(),
  dependencias: z.array(z.string()),
  /** null = no contratado en este tenant. */
  estado: z.string().nullable(),
});

/** Manifests registrados con su estado en el tenant. */
export async function modulosConEstado(db: TenantDb) {
  const filas = await db.tenantModule.findMany();
  const estado = new Map(filas.map((f) => [f.moduloId, f.estado]));
  return listarModulos().map((m) => ({
    id: m.id,
    nombre: m.nombre,
    version: m.version,
    dependencias: [...m.dependencias],
    estado: estado.get(m.id) ?? null,
  }));
}

export const modulesList = defineCapability({
  id: "core.modules.list",
  descripcion:
    "Módulos disponibles en OPAI con su estado en la empresa actual (activo, trial, suspendido o no contratado).",
  permiso: PERMISOS_CORE.tenantRead,
  input: z.object({}),
  output: z.array(moduloEstadoSchema),
  efecto: "lectura",
  dryRun: false,
  handler: async (ctx) => modulosConEstado(ctx.db),
});

export const auditList = defineCapability({
  id: "core.audit.list",
  descripcion:
    "Auditoría de escrituras de la empresa, más reciente primero. Paginado por cursor; filtros por capacidad y actor.",
  permiso: PERMISOS_CORE.auditRead,
  input: z.object({
    capability: z.string().optional(),
    actorId: z.string().optional(),
    limite: z.number().int().min(1).max(200).default(50),
    cursor: z.uuid().optional(),
  }),
  output: z.object({
    eventos: z.array(
      z.object({
        id: z.string(),
        actorType: z.string(),
        actorId: z.string().nullable(),
        viaUserId: z.string().nullable(),
        capability: z.string(),
        entityType: z.string().nullable(),
        entityId: z.string().nullable(),
        payload: z.unknown(),
        createdAt: z.date(),
      }),
    ),
    siguiente: z.string().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await ctx.db.auditEvent.findMany({
      where: {
        ...(input.capability ? { capability: input.capability } : {}),
        ...(input.actorId
          ? { OR: [{ actorId: input.actorId }, { viaUserId: input.actorId }] }
          : {}),
      },
      orderBy: { id: "desc" },
      take: input.limite + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    });
    const eventos = filas.slice(0, input.limite);
    return {
      eventos,
      siguiente: filas.length > input.limite ? (eventos.at(-1)?.id ?? null) : null,
    };
  },
});

export const usoSchema = z.object({
  desde: z.string(),
  total: z.number(),
  errores: z.number(),
  porModulo: z.array(z.object({ modulo: z.string(), total: z.number() })),
  porPortal: z.array(z.object({ portal: z.string(), total: z.number() })),
});

/** Uso de un tenant en los últimos `dias`, agrupado por módulo y por portal. */
export async function resumenUso(db: TenantDb, dias: number) {
  const desde = new Date(Date.now() - dias * 86_400_000);
  const where = { createdAt: { gte: desde } };
  const [total, errores, porModulo, porPortal] = await Promise.all([
    db.usageEvent.count({ where }),
    db.usageEvent.count({ where: { ...where, ok: false } }),
    db.usageEvent.groupBy({ by: ["modulo"], where, _count: { _all: true } }),
    db.usageEvent.groupBy({ by: ["portal"], where, _count: { _all: true } }),
  ]);
  return {
    desde: desde.toISOString(),
    total,
    errores,
    porModulo: porModulo.map((g) => ({ modulo: g.modulo, total: g._count._all })),
    porPortal: porPortal.map((g) => ({ portal: g.portal ?? "api", total: g._count._all })),
  };
}

export const usageSummary = defineCapability({
  id: "core.usage.summary",
  descripcion: "Uso de OPAI en la empresa (ejecuciones por módulo y portal) en los últimos días.",
  permiso: PERMISOS_CORE.tenantRead,
  input: z.object({ dias: z.number().int().min(1).max(365).default(30) }),
  output: usoSchema,
  efecto: "lectura",
  dryRun: false,
  handler: async (ctx, input) => resumenUso(ctx.db, input.dias),
});
