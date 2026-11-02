import { z } from "zod";

import { AMBIENTES_SII, AVISO_CAF_DIAS_DEFECTO, UMBRAL_FOLIOS_BAJOS_PCT_DEFECTO } from "@opai/domain";

import { defineCapability } from "../define";
import { dia, diaSchema, rutSchema } from "../core/maestros/comun";
import { reglaDeNegocio } from "../errores";
import { PERMISO_READ, PERMISO_VENTAS } from "./comun";

const configSchema = z.object({
  ambiente: z.enum(AMBIENTES_SII),
  rutEmisor: z.string().nullable(),
  umbralFoliosPct: z.number().int().min(1).max(100),
  avisoCafDias: z.number().int().min(1).max(365),
  fechaCorte1_0: z.string().nullable(),
});

export const dteConfigObtener = defineCapability({
  id: "finanzas.dte_config.obtener",
  descripcion:
    "Devuelve la configuración DTE del tenant: ambiente SII (certificación o producción) y RUT emisor si está definido.",
  permiso: PERMISO_READ,
  input: z.object({}),
  output: configSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const cfg = await ctx.db.dteConfig.findUnique({ where: { tenantId: ctx.tenantId } });
    return {
      ambiente: (cfg?.ambiente ?? "certificacion") as (typeof AMBIENTES_SII)[number],
      rutEmisor: cfg?.rutEmisor ?? null,
      umbralFoliosPct: cfg?.umbralFoliosPct ?? UMBRAL_FOLIOS_BAJOS_PCT_DEFECTO,
      avisoCafDias: cfg?.avisoCafDias ?? AVISO_CAF_DIAS_DEFECTO,
      fechaCorte1_0: dia(cfg?.fechaCorte1_0),
    };
  },
});

export const dteConfigActualizar = defineCapability({
  id: "finanzas.dte_config.actualizar",
  descripcion:
    "Actualiza el ambiente SII y opcionalmente el RUT emisor del tenant. Pasar a producción requiere revisión explícita del responsable antes de usarlo en vivo.",
  permiso: PERMISO_VENTAS,
  input: z.object({
    ambiente: z.enum(AMBIENTES_SII),
    rutEmisor: rutSchema.optional(),
    umbralFoliosPct: z.number().int().min(1).max(100).optional(),
    avisoCafDias: z.number().int().min(1).max(365).optional(),
    fechaCorte1_0: diaSchema.nullable().optional(),
  }),
  output: configSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (input.ambiente === "produccion") {
      // TODO(CAR-137): exigir checklist de Carlos (certificado real, CAF producción y prueba en certificación) antes de activar.
    }
    const rut = input.rutEmisor ?? undefined;
    if (dryRun) {
      return {
        ambiente: input.ambiente,
        rutEmisor: rut ?? null,
        umbralFoliosPct: input.umbralFoliosPct ?? UMBRAL_FOLIOS_BAJOS_PCT_DEFECTO,
        avisoCafDias: input.avisoCafDias ?? AVISO_CAF_DIAS_DEFECTO,
        fechaCorte1_0:
          input.fechaCorte1_0 === undefined ? null : input.fechaCorte1_0,
      };
    }
    const fechaCorte =
      input.fechaCorte1_0 === undefined
        ? undefined
        : input.fechaCorte1_0
          ? new Date(`${input.fechaCorte1_0}T00:00:00.000Z`)
          : null;
    const cfg = await ctx.db.dteConfig.upsert({
      where: { tenantId: ctx.tenantId },
      create: {
        tenantId: ctx.tenantId,
        ambiente: input.ambiente,
        rutEmisor: rut ?? null,
        umbralFoliosPct: input.umbralFoliosPct ?? UMBRAL_FOLIOS_BAJOS_PCT_DEFECTO,
        avisoCafDias: input.avisoCafDias ?? AVISO_CAF_DIAS_DEFECTO,
        ...(fechaCorte !== undefined ? { fechaCorte1_0: fechaCorte } : {}),
      },
      update: {
        ambiente: input.ambiente,
        ...(rut !== undefined ? { rutEmisor: rut } : {}),
        ...(input.umbralFoliosPct !== undefined ? { umbralFoliosPct: input.umbralFoliosPct } : {}),
        ...(input.avisoCafDias !== undefined ? { avisoCafDias: input.avisoCafDias } : {}),
        ...(fechaCorte !== undefined ? { fechaCorte1_0: fechaCorte } : {}),
      },
    });
    if (input.ambiente === "produccion" && !cfg.rutEmisor) {
      throw reglaDeNegocio("Producción requiere RUT emisor configurado.");
    }
    return {
      ambiente: cfg.ambiente as (typeof AMBIENTES_SII)[number],
      rutEmisor: cfg.rutEmisor,
      umbralFoliosPct: cfg.umbralFoliosPct,
      avisoCafDias: cfg.avisoCafDias,
      fechaCorte1_0: dia(cfg.fechaCorte1_0),
    };
  },
});
