import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { conflicto } from "../../errores";
import type { Contexto } from "../../types";
import { anexoDe } from "./comun";
import { anexoSchema, vistaAnexo } from "./vista";

/** Serializa la aprobación/rechazo de un mismo anexo, dentro de la transacción de ejecución. */
async function bloquearAnexo(ctx: Contexto, id: string) {
  await ctx.transaccion(
    (tx) => tx.$queryRaw`
    /* 07b:bloqueo-anexo */
    SELECT id FROM core.anexos_contrato WHERE tenant_id = ${ctx.tenantId}::uuid AND id = ${id}::uuid FOR UPDATE
  `,
  );
}

export const anexosRechazar = defineCapability({
  id: "core.anexos.rechazar",
  // Solo personas: la decisión sobre el anexo es humana (ADR-032); un agente no lo resuelve.
  soloPersonas: true,
  descripcion:
    "Rechaza el anexo de contrato en borrador con un motivo obligatorio (D14): no se genera documento y quien disparó el cambio sabe qué corregir.",
  permiso: PERMISOS_CORE.anexosManage,
  input: z.object({ id: z.uuid(), motivo: z.string().trim().min(3).max(500) }),
  output: anexoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (dryRun) {
      const a = await anexoDe(ctx, input.id);
      if (a.estado !== "borrador") throw conflicto("El anexo ya fue resuelto.");
      return vistaAnexo({
        ...a,
        estado: "rechazado",
        rechazadoPorId: ctx.actor.id ?? null,
        rechazadoEn: new Date(),
        motivoRechazo: input.motivo,
      });
    }
    await bloquearAnexo(ctx, input.id);
    const a = await anexoDe(ctx, input.id);
    if (a.estado !== "borrador") throw conflicto("El anexo ya fue resuelto.");
    const r = await ctx.transaccion(async (tx) => {
      const actualizado = await tx.anexoContrato.update({
        where: { id: a.id },
        data: {
          estado: "rechazado",
          rechazadoPorId: ctx.actor.id ?? null,
          rechazadoEn: new Date(),
          motivoRechazo: input.motivo,
        },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "core.anexo.rechazado",
        entidadTipo: "anexo",
        entidadId: a.id,
        payload: { personaId: a.personaId, motivo: input.motivo },
      });
      return actualizado;
    });
    return vistaAnexo(r);
  },
});
