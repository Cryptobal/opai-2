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
  resolucionSiiNumero: z.number().int().min(1).max(999_999).nullable(),
  resolucionSiiFecha: z.string().nullable(),
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
