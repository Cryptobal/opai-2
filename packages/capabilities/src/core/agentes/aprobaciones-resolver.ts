import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { conflicto } from "../../errores";
import { executeCapability } from "../../execute";
import { defineTrabajo } from "../../trabajos/registro";
import { uuidSchema } from "../esquemas";
import { pendiente } from "./aprobaciones";

export const aprobacionesAprobar = defineCapability({
  id: "core.aprobaciones.aprobar",
  soloPersonas: true,
  descripcion:
    "IRREVERSIBLE: aprueba la acción pedida por un agente y la ejecuta en el acto como la persona que aprueba (con sus permisos). Solo personas, nunca API keys.",
  permiso: PERMISOS_CORE.aprobacionesManage,
  input: z.object({ id: uuidSchema }),
  output: z.object({ estado: z.string(), resultado: z.unknown() }),
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const a = await pendiente(ctx, input.id);
    if (dryRun)
      return {
        estado: "pendiente",
        resultado: await executeCapability(ctx, a.capability, a.input, { dryRun: true }),
      };
    const { count } = await ctx.db.aprobacion.updateMany({
      where: { id: a.id, estado: "pendiente" },
      data: { estado: "aprobada", resueltaPor: ctx.actor.id ?? null, resueltaEn: new Date() },
    });
    if (count !== 1) throw conflicto("Otra persona resolvió la aprobación al mismo tiempo.");
    const resultado = await executeCapability(ctx, a.capability, a.input, {
      ...(a.idempotencyKey ? { idempotencyKey: a.idempotencyKey } : {}),
      auditoriaExtra: { aprobacionId: a.id, apiKeyId: a.apiKeyId },
    });
    await ctx.transaccion(async (tx) => {
      await tx.aprobacion.update({
        where: { id: a.id },
        data: { resultado: JSON.parse(JSON.stringify(resultado)) },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "core.aprobacion.resuelta",
        entidadTipo: "aprobacion",
        entidadId: a.id,
        payload: { estado: "aprobada", ok: resultado.ok },
      });
    });
    return { estado: "aprobada", resultado };
  },
});

export const aprobacionesRechazar = defineCapability({
  id: "core.aprobaciones.rechazar",
  soloPersonas: true,
  descripcion:
    "Rechaza la acción pedida por un agente, con motivo. No se ejecuta nada y el agente lo ve al consultar la aprobación.",
  permiso: PERMISOS_CORE.aprobacionesManage,
  input: z.object({ id: uuidSchema, motivo: z.string().trim().min(3).max(500) }),
  output: z.object({ estado: z.string() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const a = await pendiente(ctx, input.id);
    if (dryRun) return { estado: "pendiente" };
    await ctx.transaccion(async (tx) => {
      await tx.aprobacion.update({
        where: { id: a.id },
        data: {
          estado: "rechazada",
          resueltaPor: ctx.actor.id ?? null,
          resueltaEn: new Date(),
          motivo: input.motivo,
        },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "core.aprobacion.resuelta",
        entidadTipo: "aprobacion",
        entidadId: a.id,
        payload: { estado: "rechazada" },
      });
    });
    return { estado: "rechazada" };
  },
});

export const trabajoExpirarAprobaciones = defineTrabajo({
  tipo: "core.aprobaciones.expirar",
  descripcion: "Marca como vencidas las aprobaciones pendientes con más de 72 horas.",
  payload: z.object({ dia: z.string() }),
  periodicidad: "diaria",
  async handler(ctx) {
    const { count } = await ctx.db.aprobacion.updateMany({
      where: { estado: "pendiente", venceEn: { lte: new Date() } },
      data: { estado: "vencida" },
    });
    return { vencidas: count };
  },
});
