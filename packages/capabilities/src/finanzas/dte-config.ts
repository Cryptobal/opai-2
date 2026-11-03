import { z } from "zod";

import { AMBIENTES_SII, AVISO_CAF_DIAS_DEFECTO, UMBRAL_FOLIOS_BAJOS_PCT_DEFECTO } from "@opai/domain";

import { defineCapability } from "../define";
import { dia, diaSchema, escribirConEvento, rutSchema } from "../core/maestros/comun";
import { prohibido, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { PERMISO_READ, PERMISO_VENTAS_CONFIGURE } from "./comun";

const proveedorEmisionSchema = z.enum(["simulado", "simpleapi"]);
const proveedorCesionSchema = z.enum(["octava"]).nullable();

const configSchema = z.object({
  ambiente: z.enum(AMBIENTES_SII),
  rutEmisor: z.string().nullable(),
  emisionProveedor: proveedorEmisionSchema,
  cesionProveedor: proveedorCesionSchema,
  umbralFoliosPct: z.number().int().min(1).max(100),
  avisoCafDias: z.number().int().min(1).max(365),
  fechaCorte1_0: z.string().nullable(),
});

function vistaCfg(cfg: {
  ambiente: string;
  rutEmisor: string | null;
  emisionProveedor: string;
  cesionProveedor: string | null;
  umbralFoliosPct: number;
  avisoCafDias: number;
  fechaCorte1_0?: Date | null;
}) {
  return {
    ambiente: cfg.ambiente as (typeof AMBIENTES_SII)[number],
    rutEmisor: cfg.rutEmisor,
    emisionProveedor: cfg.emisionProveedor as z.infer<typeof proveedorEmisionSchema>,
    cesionProveedor: cfg.cesionProveedor as z.infer<typeof proveedorCesionSchema>,
    umbralFoliosPct: cfg.umbralFoliosPct,
    avisoCafDias: cfg.avisoCafDias,
    fechaCorte1_0: dia(cfg.fechaCorte1_0 ?? null),
  };
}

export const dteConfigObtener = defineCapability({
  id: "finanzas.dte_config.obtener",
  descripcion:
    "Devuelve la configuración DTE del tenant: ambiente SII, conectores de emisión/cesión y umbrales de aviso CAF/folios.",
  permiso: PERMISO_READ,
  input: z.object({}),
  output: configSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const cfg = await ctx.db.dteConfig.findUnique({ where: { tenantId: ctx.tenantId } });
    return vistaCfg({
      ambiente: cfg?.ambiente ?? "certificacion",
      rutEmisor: cfg?.rutEmisor ?? null,
      emisionProveedor: cfg?.emisionProveedor ?? "simulado",
      cesionProveedor: cfg?.cesionProveedor ?? null,
      umbralFoliosPct: cfg?.umbralFoliosPct ?? UMBRAL_FOLIOS_BAJOS_PCT_DEFECTO,
      avisoCafDias: cfg?.avisoCafDias ?? AVISO_CAF_DIAS_DEFECTO,
      fechaCorte1_0: cfg?.fechaCorte1_0 ?? null,
    });
  },
});

function exigeOwnerHumano(ctx: Contexto, accion: string) {
  if (ctx.actor.tipo !== "user") {
    throw prohibido(`Solo un usuario humano owner puede ${accion}.`);
  }
  if (ctx.rol !== "owner") {
    throw prohibido(`Solo el owner puede ${accion}.`);
  }
}

export const dteConfigActualizar = defineCapability({
  id: "finanzas.dte_config.actualizar",
  descripcion:
    "Actualiza ambiente SII, conectores y umbrales. Pasar a producción solo lo puede hacer el owner, con vista previa y auditoría.",
  permiso: PERMISO_VENTAS_CONFIGURE,
  input: z.object({
    ambiente: z.enum(AMBIENTES_SII),
    rutEmisor: rutSchema.optional(),
    emisionProveedor: proveedorEmisionSchema.optional(),
    cesionProveedor: proveedorCesionSchema.optional(),
    umbralFoliosPct: z.number().int().min(1).max(100).optional(),
    avisoCafDias: z.number().int().min(1).max(365).optional(),
    fechaCorte1_0: diaSchema.nullable().optional(),
  }),
  output: configSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const tocaSensibles =
      input.ambiente === "produccion" ||
      input.emisionProveedor !== undefined ||
      input.cesionProveedor !== undefined;
    if (tocaSensibles) {
      exigeOwnerHumano(ctx, "activar producción SII o cambiar conectores DTE");
    }
    const rut = input.rutEmisor ?? undefined;
    const prev = await ctx.db.dteConfig.findUnique({ where: { tenantId: ctx.tenantId } });
    const fechaCorteDb =
      input.fechaCorte1_0 === undefined
        ? prev?.fechaCorte1_0 ?? null
        : input.fechaCorte1_0
          ? new Date(`${input.fechaCorte1_0}T00:00:00.000Z`)
          : null;
    const next = {
      ambiente: input.ambiente,
      rutEmisor: rut ?? prev?.rutEmisor ?? null,
      emisionProveedor: input.emisionProveedor ?? prev?.emisionProveedor ?? "simulado",
      cesionProveedor:
        input.cesionProveedor !== undefined ? input.cesionProveedor : (prev?.cesionProveedor ?? null),
      umbralFoliosPct: input.umbralFoliosPct ?? prev?.umbralFoliosPct ?? UMBRAL_FOLIOS_BAJOS_PCT_DEFECTO,
      avisoCafDias: input.avisoCafDias ?? prev?.avisoCafDias ?? AVISO_CAF_DIAS_DEFECTO,
      fechaCorte1_0: fechaCorteDb,
    };
    if (dryRun) return vistaCfg(next);
    if (next.ambiente === "produccion" && !next.rutEmisor) {
      throw reglaDeNegocio("Producción requiere RUT emisor configurado.");
    }
    const fechaCorteAnterior = dia(prev?.fechaCorte1_0 ?? null);
    const fechaCorteNueva = dia(next.fechaCorte1_0);
    const cfg = await escribirConEvento(
      ctx,
      {
        tipo: "finanzas.dte_config.actualizada",
        entidadTipo: "dte_config",
        payload: () => ({
          ambiente: next.ambiente,
          emisionProveedor: next.emisionProveedor,
          cesionProveedor: next.cesionProveedor,
          ...(input.fechaCorte1_0 !== undefined && fechaCorteNueva !== fechaCorteAnterior
            ? { fechaCorte1_0: fechaCorteNueva }
            : {}),
        }),
      },
      (tx) =>
        tx.dteConfig.upsert({
          where: { tenantId: ctx.tenantId },
          create: { tenantId: ctx.tenantId, ...next },
          update: next,
        }),
    );
    return vistaCfg(cfg);
  },
});
