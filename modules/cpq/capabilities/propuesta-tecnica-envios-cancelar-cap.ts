import { z } from "zod";

import { defineCapability, noEncontrado, reglaDeNegocio } from "@opai/capabilities";

import { PERMISO_MANAGE } from "./permisos";
import { uuidSchema } from "./esquemas";

export const enviosPropuestaCancelar = defineCapability({
  id: "cpq.envios_propuesta.cancelar",
  descripcion: "Cancela un envío conjunto pendiente de aprobación.",
  permiso: PERMISO_MANAGE,
  input: z.object({ envioId: uuidSchema, motivo: z.string().trim().max(500).optional() }),
  output: z.object({ envioId: z.string(), estado: z.literal("cancelado") }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const row = await ctx.db.cpqPropuestaEnvio.findFirst({ where: { id: input.envioId } });
    if (!row) throw noEncontrado("El envío");
    if (row.estado !== "pendiente_aprobacion") {
      throw reglaDeNegocio("Solo se puede cancelar un envío pendiente de aprobación.");
    }
    if (dryRun) return { envioId: row.id, estado: "cancelado" as const };
    await ctx.transaccion(async (tx) => {
      const r = await tx.cpqPropuestaEnvio.updateMany({
        where: { id: row.id, tenantId: ctx.tenantId, estado: "pendiente_aprobacion" },
        data: { estado: "cancelado" },
      });
      if (r.count !== 1) throw reglaDeNegocio("El envío ya no está pendiente.");
      await ctx.eventos.emitir(tx, {
        tipo: "cpq.envio_propuesta.rechazado",
        entidadTipo: "cotizacion",
        entidadId: row.cotizacionId,
        payload: {
          envioId: row.id,
          solicitadoPorId: row.solicitadoPorId,
          motivo: input.motivo?.trim() ?? null,
        },
      });
    });
    ctx.despacharEventos();
    return { envioId: row.id, estado: "cancelado" as const };
  },
});
