import { z } from "zod";

import { defineCapability, reglaDeNegocio } from "@opai/capabilities";

import { uuidSchema } from "./esquemas";
import { PERMISO_MANAGE } from "./permisos";
import { cotizacionDe } from "./util";

const salidaSchema = z.object({ id: uuidSchema, archivada: z.boolean() });

/**
 * Archivar (CPQ v4, «Cotizaciones»): en lugar de borrar, la cotización sale de la lista y de los
 * reportes de pipeline; se restaura sin pérdida. No es un estado de versión: la columna es de la
 * cotización, así que sirve para cualquier estado salvo los que están en juego.
 */
export const cotizacionesArchivar = defineCapability({
  id: "cpq.cotizaciones.archivar",
  descripcion:
    "Archiva una cotización: sale de la lista y de los reportes de pipeline y se puede restaurar. No se archiva una aceptada ni una que espera aprobación de margen.",
  permiso: PERMISO_MANAGE,
  input: z.object({ id: uuidSchema }),
  output: salidaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const c = await cotizacionDe(ctx, input.id);
    if (c.archivadaEn) return { id: c.id, archivada: true };
    const bloqueante = await ctx.db.cpqVersion.findFirst({
      where: { cotizacionId: c.id, estado: { in: ["aceptada", "en_aprobacion"] } },
      select: { estado: true },
    });
    if (bloqueante?.estado === "aceptada")
      throw reglaDeNegocio("Una cotización aceptada es la base del contrato: no se archiva.");
    if (bloqueante)
      throw reglaDeNegocio("Retira el pedido de aprobación antes de archivar la cotización.");
    if (dryRun) return { id: c.id, archivada: true };
    await ctx.transaccion(async (tx) => {
      await tx.cpqCotizacion.updateMany({
        where: { id: c.id, archivadaEn: null },
        data: { archivadaEn: new Date(), archivadaPorId: ctx.usuario?.id ?? null },
      });
    });
    return { id: c.id, archivada: true };
  },
});

export const cotizacionesRestaurar = defineCapability({
  id: "cpq.cotizaciones.restaurar",
  descripcion: "Restaura una cotización archivada: vuelve a la lista con el estado que tenía.",
  permiso: PERMISO_MANAGE,
  input: z.object({ id: uuidSchema }),
  output: salidaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const c = await cotizacionDe(ctx, input.id);
    if (!c.archivadaEn) return { id: c.id, archivada: false };
    if (dryRun) return { id: c.id, archivada: false };
    await ctx.transaccion(async (tx) => {
      await tx.cpqCotizacion.updateMany({
        where: { id: c.id, archivadaEn: { not: null } },
        data: { archivadaEn: null, archivadaPorId: null },
      });
    });
    return { id: c.id, archivada: false };
  },
});
