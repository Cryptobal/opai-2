import { z } from "zod";

import { noEncontrado, reglaDeNegocio } from "../errores";
import { uuidSchema } from "../core/esquemas";
import type { Contexto } from "../types";
import { dondeInstalacionId, ordenSchema } from "./comun";

const puntoLineaSchema = z.object({
  puntoId: uuidSchema,
  orden: z.number().int().min(0).max(200),
  obligatorio: z.boolean().default(true),
});

export const puntosSchema = z
  .array(puntoLineaSchema)
  .min(1)
  .max(200)
  .refine((ps) => new Set(ps.map((p) => p.puntoId)).size === ps.length, "No repitas un punto")
  .refine((ps) => new Set(ps.map((p) => p.orden)).size === ps.length, "No repitas un orden");

export const camposPlantilla = {
  ordenModo: ordenSchema.default("sugerido"),
  tiempoMaxMin: z.number().int().min(5).max(480),
  tiempoMaxTramoMin: z.number().int().min(1).max(480).nullable().optional(),
  umbralIncompletaPct: z.number().int().min(0).max(100).default(20),
  permiteAdhoc: z.boolean().default(true),
};

export const incluir = {
  puntos: { orderBy: { orden: "asc" }, select: { puntoId: true, orden: true, obligatorio: true } },
} as const;

/** Los puntos son activos, de la misma instalación y del alcance del actor (ADR-022, sin enumeración). */
export async function puntosDeInstalacion(ctx: Contexto, instalacionId: string, ids: readonly string[]) {
  const filas = await ctx.db.puntoControl.findMany({
    // `instalacionId` y el alcance van en `AND`: el spread de `dondeInstalacionId` pisaría el
    // `instalacionId` pedido y dejaría usar puntos de otra instalación del alcance.
    where: { id: { in: [...ids] }, estado: "activo", AND: [{ instalacionId }, dondeInstalacionId(ctx)] },
    select: { id: true },
  });
  if (filas.length !== new Set(ids).size) throw noEncontrado("El punto de control");
}

export function validarTramo(total: number, tramo: number | null | undefined) {
  if (tramo != null && tramo >= total)
    throw reglaDeNegocio("El tiempo por tramo debe ser menor que el total.");
}

/** Los puntoId del input que no estaban ya en la secuencia de la plantilla (los que hay que validar). */
export function nuevos(puntos: readonly { puntoId: string }[], existentes: ReadonlySet<string>): string[] {
  return puntos.map((p) => p.puntoId).filter((pid) => !existentes.has(pid));
}
