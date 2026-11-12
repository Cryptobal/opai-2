import { z } from "zod";

import { defineCapability, reglaDeNegocio, sincronizarCobroDocumento } from "@opai/capabilities";

import { sincronizarAvisosEnTx } from "../aviso";
import { PERMISO_BANCOS_GESTIONAR } from "./permisos";
import { movimientoDe } from "./util";

export const bancosConciliacionDeshacer = defineCapability({
  id: "finanzas.conciliaciones.deshacer",
  descripcion: "Deshace la conciliación activa de un movimiento bancario y lo deja pendiente o sugerido.",
  permiso: PERMISO_BANCOS_GESTIONAR,
  input: z.object({ movimientoId: z.uuid(), motivo: z.string().trim().min(3).max(500) }),
  output: z.object({ deshecho: z.boolean() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await movimientoDe(ctx, input.movimientoId);
    if (dryRun) return { deshecho: true };
    await ctx.transaccion(async (tx) => {
      const movActual = await tx.movimientoBancario.findFirst({ where: { id: input.movimientoId } });
      if (!movActual) throw reglaDeNegocio("El movimiento no existe.");
      const activas = await tx.conciliacionBanco.findMany({
        where: { movimientoId: input.movimientoId, activa: true, confirmada: true },
      });
      const docsSync = new Set(
        activas.filter((c) => c.tipoEnlace === "documento_emitido").map((c) => c.enlaceId),
      );
      await tx.conciliacionBanco.updateMany({
        where: { movimientoId: input.movimientoId, activa: true },
        data: { activa: false },
      });
      for (const docId of docsSync) {
        await sincronizarCobroDocumento(tx, docId);
      }
      const nuevoEstado = movActual.origen === "manual" ? "ignorado" : "pendiente";
      await tx.movimientoBancario.update({
        where: { id: input.movimientoId },
        data: { estado: nuevoEstado },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "finanzas.banco.conciliacion_deshecha",
        entidadTipo: "movimientoBancario",
        entidadId: input.movimientoId,
        payload: { motivo: input.motivo },
      });
      await sincronizarAvisosEnTx(ctx, tx, { dryRun: false });
    });
    return { deshecho: true };
  },
});
