import { z } from "zod";

import { ajuste, defineCapability, noEncontrado, reglaDeNegocio, type Contexto } from "@opai/capabilities";

import {
  ANTICIPACION_DEFECTO,
  ANTICIPACION_MAX,
  ANTICIPACION_MIN,
  type EstadoConfirmacion,
  type FranjaConfirmacion,
  FRANJAS_CONFIRMACION,
  puedeMarcarSinRespuesta,
  type PoliticaConfirmacion,
  PLAZO_RESPUESTA_DEFECTO,
  PLAZO_RESPUESTA_MAX,
  PLAZO_RESPUESTA_MIN,
} from "../domain/confirmacion";
import { PERMISO_ATENDER, uuidSchema } from "./esquemas";
import { dondeAlcance } from "./util";

const PERMISO_CONFIG = "central:config.manage";

/** Política efectiva: ajustes del tenant y, si existe, la fila de la instalación. */
export async function politicaConfirmacion(
  ctx: Contexto,
  instalacionId: string,
): Promise<PoliticaConfirmacion & { instalacionId: string }> {
  const [anticipacionMin, plazoRespuestaMin, franja] = await Promise.all([
    ajuste<number>(ctx, "central", "confirmacion_anticipacion_min"),
    ajuste<number>(ctx, "central", "confirmacion_plazo_respuesta_min"),
    ajuste<FranjaConfirmacion>(ctx, "central", "confirmacion_franja"),
  ]);
  const base: PoliticaConfirmacion = {
    anticipacionMin: anticipacionMin ?? ANTICIPACION_DEFECTO,
    plazoRespuestaMin: plazoRespuestaMin ?? PLAZO_RESPUESTA_DEFECTO,
    franja: franja ?? "ambos",
  };
  const propia = await ctx.db.centralConfirmacionPolitica.findFirst({
    where: { instalacionId },
    select: { anticipacionMin: true, plazoRespuestaMin: true, franja: true },
  });
  if (!propia) return { ...base, instalacionId };
  return {
    instalacionId,
    anticipacionMin: propia.anticipacionMin,
    plazoRespuestaMin: propia.plazoRespuestaMin,
    franja: propia.franja as FranjaConfirmacion,
  };
}

export const confirmacionMarcarSinRespuesta = defineCapability({
  id: "central.confirmacion.marcar_sin_respuesta",
  descripcion: "Marca una confirmación vencida como sin respuesta (lo usa el trabajo periódico de la Central).",
  permiso: PERMISO_ATENDER,
  input: z.object({ id: uuidSchema }),
  output: z.object({ id: uuidSchema, estado: z.literal("sin_respuesta") }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    const fila = await ctx.db.centralConfirmacionTurno.findFirst({ where: { id: i.id, ...dondeAlcance(ctx) } });
    if (!fila) throw noEncontrado("La confirmación");
    if (!puedeMarcarSinRespuesta(fila.estado as EstadoConfirmacion))
      throw reglaDeNegocio("Solo un aviso pendiente puede quedar sin respuesta.");
    if (dryRun) return { id: fila.id, estado: "sin_respuesta" as const };
    await ctx.db.centralConfirmacionTurno.update({
      where: { id: fila.id },
      data: { estado: "sin_respuesta", motivo: null },
    });
    return { id: fila.id, estado: "sin_respuesta" as const };
  },
});

export const confirmacionPoliticaGuardar = defineCapability({
  id: "central.confirmacion.politica_guardar",
  descripcion:
    "Guarda la política de confirmación de turno para una instalación (anticipación, plazo y franja). Sin fila, rigen los ajustes de la empresa en Configuración › Central.",
  permiso: PERMISO_CONFIG,
  input: z.object({
    instalacionId: uuidSchema,
    anticipacionMin: z.number().int().min(ANTICIPACION_MIN).max(ANTICIPACION_MAX),
    plazoRespuestaMin: z.number().int().min(PLAZO_RESPUESTA_MIN).max(PLAZO_RESPUESTA_MAX),
    franja: z.enum(FRANJAS_CONFIRMACION),
  }),
  output: z.object({ instalacionId: uuidSchema }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, i, { dryRun }) {
    const inst = await ctx.db.instalacion.findFirst({ where: { id: i.instalacionId }, select: { id: true } });
    if (!inst) throw noEncontrado("La instalación");
    if (dryRun) return { instalacionId: inst.id };
    await ctx.db.centralConfirmacionPolitica.upsert({
      where: { tenantId_instalacionId: { tenantId: ctx.tenantId, instalacionId: inst.id } },
      create: {
        tenantId: ctx.tenantId,
        instalacionId: inst.id,
        anticipacionMin: i.anticipacionMin,
        plazoRespuestaMin: i.plazoRespuestaMin,
        franja: i.franja,
      },
      update: {
        anticipacionMin: i.anticipacionMin,
        plazoRespuestaMin: i.plazoRespuestaMin,
        franja: i.franja,
      },
    });
    return { instalacionId: inst.id };
  },
});