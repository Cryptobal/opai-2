import { z } from "zod";

import { PERMISOS_PLATAFORMA } from "@opai/domain";

import { defineCapability } from "../../define";
import { requierePlataforma } from "../comun";
import { uuidSchema } from "../esquemas";

/**
 * Auditoría de plataforma (CAR-36): las escrituras `platform.*`, sus pedidos de aprobación y sus
 * decisiones, fuera de las empresas. Solo con `platformRole` (owner o support).
 */
export const platformAuditoriaList = defineCapability({
  id: "platform.auditoria.list",
  descripcion:
    "Plataforma: auditoría de las acciones de plataforma (crear empresas, roles, módulos, aprobaciones de agentes), la más reciente primero, filtrable por empresa, capacidad y fechas, con el antes y el después de cada cambio.",
  permiso: PERMISOS_PLATAFORMA.tenantsRead,
  sinTenant: true,
  input: z.object({
    tenantId: uuidSchema.optional().describe("Solo las que actuaron sobre esta empresa."),
    capability: z.string().max(120).optional().describe('Prefijo: "platform.tenants".'),
    limite: z.number().int().min(1).max(100).default(50),
    antesDeSeq: z.number().int().min(1).optional().describe("Cursor: `seq` del último leído."),
    desde: z.iso.date().optional().describe("Desde este día (UTC), inclusive."),
    hasta: z.iso.date().optional().describe("Hasta este día (UTC), inclusive."),
  }),
  output: z.object({
    eventos: z.array(
      z.object({
        seq: z.number(),
        actorType: z.string(),
        actorId: z.string().nullable(),
        viaUserId: z.string().nullable(),
        capability: z.string(),
        tenantObjetivoId: z.string().nullable(),
        origenTenantId: z.string().nullable(),
        entityType: z.string().nullable(),
        entityId: z.string().nullable(),
        payload: z.unknown(),
        /** Antes y después de un cambio global (CAR-41), si la capacidad los declara. */
        antes: z.unknown(),
        despues: z.unknown(),
        creadoEn: z.string(),
        hash: z.string(),
      }),
    ),
    siguiente: z.number().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  // Filtrada por empresa, la lectura queda en la auditoría global con esa empresa objetivo (CAR-323).
  tenantObjetivo: (input) => input.tenantId ?? undefined,
  async handler(ctx, input) {
    const filas = await requierePlataforma(ctx).globales.listarAuditoriaPlataforma({
      ...(input.tenantId ? { tenantObjetivoId: input.tenantId } : {}),
      ...(input.capability ? { capability: input.capability } : {}),
      ...(input.antesDeSeq ? { antesDeSeq: input.antesDeSeq } : {}),
      ...(input.desde ? { desde: new Date(`${input.desde}T00:00:00Z`) } : {}),
      ...(input.hasta
        ? { hasta: new Date(Date.parse(`${input.hasta}T00:00:00Z`) + 86_400_000) }
        : {}),
      limite: input.limite,
    });
    return {
      eventos: filas.map((f) => ({
        seq: f.seq,
        actorType: f.actorType,
        actorId: f.actorId,
        viaUserId: f.viaUserId,
        capability: f.capability,
        tenantObjetivoId: f.tenantObjetivoId,
        origenTenantId: f.origenTenantId,
        entityType: f.entityType,
        entityId: f.entityId,
        payload: f.payload,
        antes: f.antes ?? null,
        despues: f.despues ?? null,
        creadoEn: f.createdAt.toISOString(),
        hash: f.hash,
      })),
      siguiente: filas.length === input.limite ? (filas.at(-1)?.seq ?? null) : null,
    };
  },
});
