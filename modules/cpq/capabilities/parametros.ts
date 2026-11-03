import { z } from "zod";

import { defineCapability, noEncontrado } from "@opai/capabilities";

import { combinarInstrumentos, instrumentosParcialSchema, instrumentosSchema, leerInstrumentos } from "../persistencia/instrumentos-version";
import { modeloDesdeCatalogo } from "../persistencia/catalogo-modelo";
import { recalcularVersion } from "../persistencia/recalcular";
import { mesesContrato, exigirBorrador, versionDeCotizacion } from "../persistencia/version";
import { uuidSchema } from "./esquemas";
import { PERMISO_COSTOS, PERMISO_MANAGE } from "./permisos";

const salida = z.object({
  versionId: uuidSchema,
  mesesContrato: z.number().int(),
  margenModo: z.string(),
  margenObjetivoPct: z.number().int().nullable(),
  instrumentos: instrumentosSchema,
  sobrescrito: z.boolean(),
  ventaMensualClp: z.number().int().nullable(),
});

export const versionParametros = defineCapability({
  id: "cpq.versiones.parametros",
  descripcion:
    "Ajusta los parámetros financieros de una versión en borrador: costo financiero, póliza, RC, meses de contrato, margen y modo; con vista previa de la venta.",
  permiso: PERMISO_MANAGE,
  input: z.object({
    versionId: uuidSchema,
    instrumentos: instrumentosParcialSchema.optional().describe("Solo lo que cambia; tasas y UF escalados."),
    restablecerInstrumentos: z.boolean().optional().describe("Vuelve a los valores por defecto del tenant."),
    mesesContrato: z.number().int().min(1).max(120).nullable().optional(),
    margenModo: z.enum(["margen_sobre_venta", "markup", "margen_sobre_mano_de_obra"]).optional(),
    margenObjetivoPct: z.number().int().min(0).max(999_999).optional(),
  }),
  output: salida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    // Instrumentos, meses y margen son datos de costo y margen (R59).
    if (!ctx.autorizar(PERMISO_COSTOS)) throw noEncontrado("Parámetros financieros");
    const version = await versionDeCotizacion(ctx, input.versionId);
    exigirBorrador(version);
    const modelo = await modeloDesdeCatalogo(ctx);
    const base = leerInstrumentos(version.instrumentosJson) ?? modelo.instrumentos;
    const instrumentos = input.restablecerInstrumentos
      ? modelo.instrumentos
      : input.instrumentos ? combinarInstrumentos(base, input.instrumentos) : base;
    const json = input.restablecerInstrumentos ? null : input.instrumentos ? JSON.stringify(instrumentos) : version.instrumentosJson;
    const meses = input.mesesContrato === undefined ? version.mesesContrato : input.mesesContrato;
    const cambios = {
      instrumentosJson: json,
      mesesContrato: meses,
      margenModo: input.margenModo ?? version.margenModo,
      margenObjetivoPct: input.margenObjetivoPct ?? version.margenObjetivoPct,
    };
    const respuesta = (venta: number | null) => ({
      versionId: version.id,
      mesesContrato: meses ?? mesesContrato(version.validaHasta),
      margenModo: cambios.margenModo,
      margenObjetivoPct: cambios.margenObjetivoPct,
      instrumentos,
      sobrescrito: json !== null,
      ventaMensualClp: venta,
    });
    if (dryRun) {
      const r = await recalcularVersion(ctx, version.cotizacionId, version.numero, false, {
        version: (v) => ({ ...v, ...cambios }),
      });
      return respuesta(r?.ventaMensual ?? null);
    }
    await ctx.db.cpqVersion.update({ where: { id: version.id }, data: cambios });
    const r = await recalcularVersion(ctx, version.cotizacionId, version.numero, true);
    return respuesta(r?.ventaMensual ?? null);
  },
});
