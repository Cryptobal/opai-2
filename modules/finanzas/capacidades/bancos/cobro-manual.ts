import { z } from "zod";

import { defineCapability } from "@opai/capabilities";
import { registrarCobroDocumento } from "@opai/capabilities";

import { PERMISO_BANCOS_GESTIONAR } from "./permisos";

/** Registra un pago manual sobre un DTE emitido sin movimiento bancario. */
export const bancosCobroManual = defineCapability({
  id: "finanzas.cobros.manual",
  descripcion: "Registra un cobro manual sobre una factura emitida actualizando estado de cobro.",
  permiso: PERMISO_BANCOS_GESTIONAR,
  input: z.object({
    documentoId: z.uuid(),
    monto: z.number().int().positive(),
    nota: z.string().max(300).optional(),
  }),
  output: z.object({ estadoCobro: z.string(), montoCobrado: z.number().int() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (dryRun) return { estadoCobro: "pagada_parcial", montoCobrado: input.monto };
    let out = { estadoCobro: "pendiente", montoCobrado: 0 };
    await ctx.transaccion(async (tx) => {
      out = await registrarCobroDocumento(tx, { documentoId: input.documentoId, monto: input.monto });
      await ctx.eventos.emitir(tx, {
        tipo: "finanzas.banco.cobro_manual",
        entidadTipo: "documentoEmitido",
        entidadId: input.documentoId,
        payload: input.nota ? { nota: input.nota } : undefined,
      });
    });
    return out;
  },
});
