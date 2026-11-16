import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { dondeInstalacion, dondePuesto } from "../core/maestros/alcance";
import { defineCapability } from "../define";
import { noEncontrado } from "../errores";
import { PERMISO_WRITE } from "./comun";

const inputSchema = z.discriminatedUnion("sujetoTipo", [
  z.object({
    sujetoTipo: z.literal("instalacion"),
    sujetoId: uuidSchema,
    montoClp: z.number().int().min(0).max(100_000_000),
  }),
  z.object({
    sujetoTipo: z.literal("puesto"),
    sujetoId: uuidSchema,
    montoClp: z.number().int().min(0).max(100_000_000),
  }),
]);

/** Fija la tarifa sugerida de turno extra de una instalación o un puesto (CAR-96). */
export const turnosExtraMontoFijar = defineCapability({
  id: "pauta.turnos_extra.monto_fijar",
  descripcion:
    "Fija el monto sugerido (CLP entero) de turno extra para una instalación o un puesto. La tarifa del puesto tiene prioridad sobre la de la instalación al registrar. No paga ni cambia turnos ya registrados.",
  permiso: PERMISO_WRITE,
  input: inputSchema,
  output: z.object({
    sujetoTipo: z.enum(["instalacion", "puesto"]),
    sujetoId: z.string(),
    montoClp: z.number().int(),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (input.sujetoTipo === "instalacion") {
      const ok = await ctx.db.instalacion.findFirst({
        where: { id: input.sujetoId, archivadaEn: null, AND: [dondeInstalacion(ctx)] },
        select: { id: true },
      });
      if (!ok) throw noEncontrado("La instalación");
    } else {
      const ok = await ctx.db.puesto.findFirst({
        where: { id: input.sujetoId, estado: "activo", AND: [dondePuesto(ctx)] },
        select: { id: true },
      });
      if (!ok) throw noEncontrado("El puesto");
    }
    if (dryRun) return input;
    await ctx.db.tarifaTurnoExtra.upsert({
      where: {
        tenantId_sujetoTipo_sujetoId: {
          tenantId: ctx.tenantId,
          sujetoTipo: input.sujetoTipo,
          sujetoId: input.sujetoId,
        },
      },
      create: {
        tenantId: ctx.tenantId,
        sujetoTipo: input.sujetoTipo,
        sujetoId: input.sujetoId,
        montoClp: input.montoClp,
      },
      update: { montoClp: input.montoClp },
    });
    return input;
  },
});
