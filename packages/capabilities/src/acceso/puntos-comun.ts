import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import type { cursorDe } from "../core/maestros/comun";
import type { Contexto } from "../types";

export const MAX_PUNTOS = 20;
export const TIPOS_PUNTO = ["peatonal", "vehicular", "mixto"] as const;

export const puntoSchema = z.object({
  id: uuidSchema,
  nombre: z.string().trim().min(2).max(60),
  tipo: z.enum(TIPOS_PUNTO),
  activo: z.boolean(),
});
export type Punto = z.infer<typeof puntoSchema>;

const tipoDe = (t: string): Punto["tipo"] => TIPOS_PUNTO.find((x) => x === t) ?? "peatonal";

/** Puntos de una instalación: activos primero y en su orden (la RLS acota a la empresa); `tramo`, para paginar. */
export async function puntosDe(
  ctx: Contexto,
  instalacionId: string,
  tramo: ReturnType<typeof cursorDe> | object = {},
): Promise<Punto[]> {
  const filas = await ctx.db.puntoAcceso.findMany({
    where: { instalacionId },
    orderBy: [{ activo: "desc" }, { orden: "asc" }, { id: "asc" }],
    ...tramo,
    select: { id: true, nombre: true, tipo: true, activo: true },
  });
  return filas.map((p) => ({ ...p, tipo: tipoDe(p.tipo) }));
}
