import { z } from "zod";

import { PERMISOS_CORE, PCT_ESCALA } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import { uuidSchema } from "../esquemas";

export const remuneracionesMutualConfirmar = defineCapability({
  id: "core.remuneraciones.confirmar_mutual",
  descripcion: "Registra la tasa adicional de mutual del tenant según su resolución.",
  permiso: PERMISOS_CORE.remuneracionesManage,
  input: z.object({
    tasaEscalada: z.number().int().min(0).max(PCT_ESCALA),
    motivo: z.string().max(500).optional(),
  }),
  output: z.object({ tasaEscalada: z.number().int(), estado: z.literal("vigente") }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (dryRun) return { tasaEscalada: input.tasaEscalada, estado: "vigente" as const };
    const actor = ctx.actor.tipo === "user" ? ctx.actor.id : null;
    await ctx.transaccion(async (tx) => {
      await tx.remuneracionesPerfil.upsert({
        where: { tenantId: ctx.tenantId },
        create: {
          tenantId: ctx.tenantId,
          mutualAdicionalEscalada: input.tasaEscalada,
          mutualAdicionalEstado: "vigente",
          mutualConfirmadoPorId: actor,
          mutualConfirmadoEn: new Date(),
        },
        update: {
          mutualAdicionalEscalada: input.tasaEscalada,
          mutualAdicionalEstado: "vigente",
          mutualConfirmadoPorId: actor,
          mutualConfirmadoEn: new Date(),
        },
      });
    });
    return { tasaEscalada: input.tasaEscalada, estado: "vigente" as const };
  },
});

export const remuneracionesIndicadoresConfirmar = defineCapability({
  id: "core.remuneraciones.confirmar",
  descripcion: "Confirma un valor propuesto o retenido del tenant (una persona basta).",
  permiso: PERMISOS_CORE.remuneracionesManage,
  input: z.object({ valorTenantId: uuidSchema }),
  output: z.object({ id: uuidSchema, estado: z.literal("vigente") }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { valorTenantId }, { dryRun }) {
    const row = await ctx.db.valorTenant.findFirst({ where: { id: valorTenantId, tenantId: ctx.tenantId } });
    if (!row) throw noEncontrado("El valor");
    if (dryRun) return { id: valorTenantId, estado: "vigente" as const };
    const actor = ctx.actor.tipo === "user" ? ctx.actor.id : null;
    await ctx.transaccion(async (tx) => {
      await tx.valorTenant.update({
        where: { id: valorTenantId },
        data: { estado: "vigente", confirmadoPorId: actor, confirmadoEn: new Date() },
      });
    });
    return { id: valorTenantId, estado: "vigente" as const };
  },
});
