import { z } from "zod";

import { AMBIENTES_SII } from "@opai/domain";

import { dia } from "../core/maestros/comun";
import { prohibido } from "../errores";
import type { Contexto } from "../types";

export const proveedorEmisionSchema = z.enum(["simulado", "simpleapi"]);
export const proveedorCesionSchema = z.enum(["octava"]).nullable();

export const configDteSchema = z.object({
  ambiente: z.enum(AMBIENTES_SII),
  rutEmisor: z.string().nullable(),
  emisionProveedor: proveedorEmisionSchema,
  cesionProveedor: proveedorCesionSchema,
  resolucionSiiNumero: z.number().int().min(0).max(999_999).nullable(),
  resolucionSiiFecha: z.string().nullable(),
  acteco: z.number().int().nullable(),
  oficinaSii: z.string().nullable(),
  umbralFoliosPct: z.number().int().min(1).max(100),
  avisoCafDias: z.number().int().min(1).max(365),
  fechaCorte1_0: z.string().nullable(),
});

export function vistaCfgDte(cfg: {
  ambiente: string;
  rutEmisor: string | null;
  emisionProveedor: string;
  cesionProveedor: string | null;
  resolucionSiiNumero: number | null;
  resolucionSiiFecha: Date | null;
  acteco?: number | null;
  oficinaSii?: string | null;
  umbralFoliosPct: number;
  avisoCafDias: number;
  fechaCorte1_0?: Date | null;
}) {
  return {
    ambiente: cfg.ambiente as (typeof AMBIENTES_SII)[number],
    rutEmisor: cfg.rutEmisor,
    emisionProveedor: cfg.emisionProveedor as z.infer<typeof proveedorEmisionSchema>,
    cesionProveedor: cfg.cesionProveedor as z.infer<typeof proveedorCesionSchema>,
    resolucionSiiNumero: cfg.resolucionSiiNumero ?? null,
    resolucionSiiFecha: dia(cfg.resolucionSiiFecha ?? null),
    acteco: cfg.acteco ?? null,
    oficinaSii: cfg.oficinaSii ?? null,
    umbralFoliosPct: cfg.umbralFoliosPct,
    avisoCafDias: cfg.avisoCafDias,
    fechaCorte1_0: dia(cfg.fechaCorte1_0 ?? null),
  };
}

export function exigeOwnerHumanoDte(ctx: Contexto, accion: string) {
  if (ctx.actor.tipo !== "user") {
    throw prohibido(`Solo un usuario humano owner puede ${accion}.`);
  }
  if (ctx.rol !== "owner") {
    throw prohibido(`Solo el owner puede ${accion}.`);
  }
}

/**
 * Traduce un rechazo de la base (CHECK de `finanzas.dte_config`) a un mensaje de negocio (CAR-240): la persona tiene
 * que saber qué campo no se aceptó, nunca un «no pasó nada». Devuelve null si el error no es de un CHECK conocido.
 */
export function mensajeRechazoDteConfig(error: unknown): string | null {
  const meta = (error as { meta?: { code?: string; message?: string } } | null)?.meta;
  const texto = `${meta?.code ?? ""} ${String(meta?.message ?? (error as Error)?.message ?? "")}`;
  if (!texto.includes("23514") && !texto.includes("check constraint")) return null;
  if (texto.includes("resolucion_sii_numero"))
    return "No se pudo guardar el N° de resolución SII: la base no lo aceptó. En certificación el N° es 0; si sigue fallando, avise a un administrador.";
  if (texto.includes("umbral_folios_pct")) return "El aviso de folios bajos debe estar entre 1 y 100 %.";
  if (texto.includes("aviso_caf_dias")) return "El aviso de vencimiento del CAF debe estar entre 1 y 365 días.";
  if (texto.includes("emision_proveedor")) return "El conector de emisión debe ser Simulado o SimpleAPI.";
  return "La base de datos rechazó un valor de la configuración DTE; revise los campos y vuelva a guardar.";
}
