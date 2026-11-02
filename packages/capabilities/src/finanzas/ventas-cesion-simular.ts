import { z } from "zod";

import { puedeCederDocumento, simularCesion } from "@opai/domain";

import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { PERMISO_VENTAS, documentoEmitidoIdSchema } from "./ventas-comun";

export const simulacionCesionSchema = z.object({
  documentoId: z.string(),
  factorRut: z.string(),
  factorNombre: z.string().nullable(),
  tasaBps: z.number().int(),
  anticipo: z.number().int(),
  merma: z.number().int(),
  saldoFactor: z.number().int(),
  netoAlCeder: z.number().int(),
});

export const ventasCesionSimular = defineCapability({
  id: "finanzas.ventas.cesion_simular",
  descripcion:
    "Simula una cesión (factoring): anticipo, merma y saldo del factor antes de enviar el AEC (paridad 1.0).",
  permiso: PERMISO_VENTAS,
  input: z.object({
    documentoId: documentoEmitidoIdSchema,
    factorRut: z.string().trim().min(3).max(20),
    factorNombre: z.string().trim().max(120).optional(),
    tasaBps: z.number().int().min(0).max(10_000).default(250),
  }),
  output: simulacionCesionSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const doc = await ctx.db.documentoEmitido.findFirst({ where: { id: input.documentoId } });
    if (!doc) throw noEncontrado("El documento");
    const bloqueo = puedeCederDocumento({
      tipoDte: doc.tipoDte,
      estadoDte: doc.estadoDte,
      cesionEstado: doc.cesionEstado,
      xmlStorageKey: doc.xmlStorageKey,
    });
    if (bloqueo) throw reglaDeNegocio(bloqueo);
    const calc = simularCesion(doc.montoTotal, input.tasaBps);
    return {
      documentoId: doc.id,
      factorRut: input.factorRut,
      factorNombre: input.factorNombre ?? null,
      tasaBps: input.tasaBps,
      ...calc,
    };
  },
});
