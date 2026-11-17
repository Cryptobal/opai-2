import { z } from "zod";

import { TIPOS_MOVIMIENTO_MI_DT } from "@opai/domain";

import { defineCapability } from "../../define";
import { uuidSchema } from "../../core/esquemas";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import { aFecha, diaSchema } from "../../core/maestros/comun";
import { documentoExiste, PERMISO_OBLIGACIONES } from "../comun";
import { movimientoSchema, vistaMovimiento } from "./esquemas";
import { movimientosMiDt } from "./movimientos";

/** Marca un movimiento como registrado en Mi DT con fecha y comprobante. */
export const cumplimientoDtMovimientosRegistrar = defineCapability({
  id: "nomina.midt.registrar",
  descripcion:
    "Marca un alta, baja, anexo o finiquito como registrado en Mi DT con la fecha de registro y el comprobante (PDF o imagen). OPAI no envía nada al portal.",
  permiso: PERMISO_OBLIGACIONES,
  input: z.object({ movimientoTipo: z.enum(TIPOS_MOVIMIENTO_MI_DT), referenciaId: uuidSchema, registradoEn: diaSchema, documentoId: uuidSchema }),
  output: movimientoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const items = await movimientosMiDt(ctx);
    const m = items.find((x) => x.movimientoTipo === input.movimientoTipo && x.referenciaId === input.referenciaId);
    if (!m) throw noEncontrado("El movimiento");
    if (m.registrado) throw reglaDeNegocio("Este movimiento ya está registrado en Mi DT.");
    await documentoExiste(ctx, input.documentoId);
    if (dryRun) return { ...vistaMovimiento(m), plazoEtiqueta: `Registrado el ${input.registradoEn}`, plazoTono: "success" as const, registrado: true, registradoEn: input.registradoEn, comprobanteDocumentoId: input.documentoId };
    await ctx.db.nominaRegistroMiDt.create({
      data: { tenantId: ctx.tenantId, movimientoTipo: input.movimientoTipo, referenciaId: input.referenciaId, personaId: m.personaId, hechoEn: aFecha(m.hechoEn), registradoEn: aFecha(input.registradoEn), documentoId: input.documentoId },
    });
    const actualizado = (await movimientosMiDt(ctx)).find((x) => x.clave === m.clave);
    if (!actualizado) throw noEncontrado("El movimiento");
    return vistaMovimiento(actualizado);
  },
});