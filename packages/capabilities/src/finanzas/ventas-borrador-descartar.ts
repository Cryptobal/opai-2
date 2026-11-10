// Descartar un borrador (CAR-248): se borra solo si nunca tuvo folio ni salió al SII. Un documento emitido jamás se
// borra (para anularlo está la nota de crédito). Es irreversible: a un agente le pide aprobación humana.
import { z } from "zod";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { reglaDeNegocio } from "../errores";
import { describirDocumento } from "./ventas-aprobacion-texto";
import { bloquearDocumento, cargarBorradorEditable } from "./ventas-borrador-editable";
import { PERMISO_VENTAS } from "./ventas-comun";

export const ventasDescartarBorrador = defineCapability({
  id: "finanzas.ventas.descartar_borrador",
  descripcion:
    "Descarta (borra) un borrador de factura o de nota de débito que aún no tiene folio ni salió al SII. Un documento emitido nunca se borra. Es irreversible; use la vista previa para ver qué se descartaría.",
  permiso: PERMISO_VENTAS,
  input: z.object({ documentoId: uuidSchema }),
  output: z.object({ documentoId: uuidSchema, tipoDte: z.number().int(), descartado: z.boolean() }),
  efecto: "irreversible",
  dryRun: true,
  describirAprobacion: describirDocumento((d) => `descartar el borrador de ${d}`),
  async handler(ctx, input, { dryRun }) {
    const doc = await cargarBorradorEditable(ctx, input.documentoId);
    if (dryRun) return { documentoId: doc.id, tipoDte: doc.tipoDte, descartado: false };
    await ctx.transaccion(async (tx) => {
      await bloquearDocumento(tx, ctx.tenantId, doc.id);
      await cargarBorradorEditable({ db: tx }, doc.id); // las condiciones se revisan de nuevo con el documento bloqueado
      const where = { documentoId: doc.id };
      await tx.documentoEmitidoDestinatario.deleteMany({ where });
      await tx.documentoEmitidoLinea.deleteMany({ where });
      await tx.documentoEmitidoReferencia.deleteMany({ where });
      const { count } = await tx.documentoEmitido.deleteMany({
        where: { id: doc.id, estadoDte: "borrador", folio: null, trackIdSii: null, xmlStorageKey: null },
      });
      if (count !== 1) throw reglaDeNegocio("El borrador ya no se puede descartar; otro proceso pudo emitirlo.");
      await ctx.eventos.emitir(tx, { tipo: "finanzas.venta.borrador_descartado", entidadTipo: "documento_emitido", entidadId: doc.id, payload: { tipoDte: doc.tipoDte } });
    });
    return { documentoId: doc.id, tipoDte: doc.tipoDte, descartado: true };
  },
});
