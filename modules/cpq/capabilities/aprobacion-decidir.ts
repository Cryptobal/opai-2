import { z } from "zod";

import { defineCapability, noEncontrado, prohibido } from "@opai/capabilities";

import { resolverAprobacionMargen, retirarAprobacion } from "../persistencia/aprobacion-margen";
import { exigirDecisorAprobacionMargen } from "../persistencia/aprobacion-reglas";
import { cargarFilasVersion } from "../persistencia/recalcular";
import { uuidSchema } from "./esquemas";
import { PERMISO_APROBAR, PERMISO_MANAGE } from "./permisos";
import { cotizacionDe } from "./util";

export const cotizacionesRetirarAprobacion = defineCapability({
  id: "cpq.cotizaciones.retirar_aprobacion",
  descripcion: "Retira un pedido de aprobación de margen y devuelve la versión a borrador.",
  permiso: PERMISO_MANAGE,
  input: z.object({ id: uuidSchema }),
  output: z.object({ estado: z.literal("borrador") }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await cotizacionDe(ctx, input.id);
    const pack = await cargarFilasVersion(ctx, input.id, undefined, false);
    if (!pack) throw noEncontrado("La versión");
    if (dryRun) return { estado: "borrador" as const };
    return retirarAprobacion(ctx, pack.version.id);
  },
});

export const cotizacionesAprobarMargen = defineCapability({
  id: "cpq.cotizaciones.aprobar",
  descripcion: "Aprueba una cotización en aprobación por margen bajo o subvaloración; solo personas.",
  permiso: PERMISO_APROBAR,
  input: z.object({ id: uuidSchema }),
  output: z.object({
    estado: z.literal("lista"),
    aprobacionId: uuidSchema,
    autoaprobacion: z.boolean(),
  }),
  efecto: "escritura",
  dryRun: true,
  soloPersonas: true,
  auditoriaPayload: (_ctx, _entrada, salida) =>
    salida.autoaprobacion ? { autoaprobacion: true as const } : {},
  async handler(ctx, input, { dryRun }) {
    if (ctx.actor.tipo !== "user") throw prohibido("Solo una persona puede aprobar el margen.");
    const cot = await cotizacionDe(ctx, input.id);
    const pack = await cargarFilasVersion(ctx, input.id, undefined, false);
    if (!pack) throw noEncontrado("La versión");
    if (dryRun) {
      const pend = await ctx.db.cpqAprobacion.findFirst({
        where: { versionId: pack.version.id, estado: "pendiente" },
        orderBy: { createdAt: "desc" },
      });
      if (!pend) throw noEncontrado("La aprobación");
      const { autoaprobacion } = exigirDecisorAprobacionMargen(ctx, cot.creadoPorId);
      return { estado: "lista" as const, aprobacionId: pend.id, autoaprobacion };
    }
    const r = await resolverAprobacionMargen(ctx, pack.version.id, true);
    return {
      estado: "lista" as const,
      aprobacionId: r.aprobacionId,
      autoaprobacion: r.autoaprobacion,
    };
  },
});

export const cotizacionesRechazarAprobacion = defineCapability({
  id: "cpq.cotizaciones.rechazar_aprobacion",
  descripcion: "Rechaza la aprobación de margen con motivo y devuelve la cotización a borrador.",
  permiso: PERMISO_APROBAR,
  input: z.object({ id: uuidSchema, motivo: z.string().trim().min(1).max(500) }),
  output: z.object({ estado: z.literal("borrador"), aprobacionId: uuidSchema }),
  efecto: "escritura",
  dryRun: true,
  soloPersonas: true,
  async handler(ctx, input, { dryRun }) {
    if (ctx.actor.tipo !== "user") throw prohibido("Solo una persona puede rechazar el margen.");
    await cotizacionDe(ctx, input.id);
    const pack = await cargarFilasVersion(ctx, input.id, undefined, false);
    if (!pack) throw noEncontrado("La versión");
    if (dryRun) return { estado: "borrador" as const, aprobacionId: pack.version.id };
    const r = await resolverAprobacionMargen(ctx, pack.version.id, false, input.motivo);
    return { estado: "borrador" as const, aprobacionId: r.aprobacionId };
  },
});
