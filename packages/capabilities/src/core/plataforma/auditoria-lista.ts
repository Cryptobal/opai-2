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
    "Plataforma: auditoría de las acciones de plataforma (crear empresas, roles, módulos, aprobaciones de agentes), la más reciente primero, filtrable por empresa y capacidad.",
  permiso: PERMISOS_PLATAFORMA.tenantsRead,
  sinTenant: true,
  input: z.object({
    tenantId: uuidSchema.optional().describe("Solo las que actuaron sobre esta empresa."),
    capability: z.string().max(120).optional().describe('Prefijo: "platform.tenants".'),
    limite: z.number().int().min(1).max(100).default(50),
    antesDeSeq: z.number().int().min(1).optional().describe("Cursor: `seq` del último leído."),
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
        creadoEn: z.string(),
        hash: z.string(),
      }),
    ),
    siguiente: z.number().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await requierePlataforma(ctx).globales.listarAuditoriaPlataforma({
      ...(input.tenantId ? { tenantObjetivoId: input.tenantId } : {}),
      ...(input.capability ? { capability: input.capability } : {}),
      ...(input.antesDeSeq ? { antesDeSeq: input.antesDeSeq } : {}),
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
        creadoEn: f.createdAt.toISOString(),
        hash: f.hash,
      })),
      siguiente: filas.length === input.limite ? (filas.at(-1)?.seq ?? null) : null,
    };
  },
});
