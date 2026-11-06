import { z } from "zod";

import type { Contexto } from "../types";
import { solicitudSchema } from "./solicitudes-comun";

/** Solicitud con el nombre de quien la revisa (el responsable asignado al derivarla), si lo hay. */
export const solicitudConResponsableSchema = solicitudSchema.extend({
  responsableNombre: z
    .string()
    .nullable()
    .describe("Nombre de la persona responsable de revisarla; null si no tiene responsable."),
});

/**
 * Nombres de los responsables de un conjunto de solicitudes. Solo se resuelven membresías de la
 * empresa actual (RLS), así que un responsable que ya no es de la empresa queda sin nombre.
 */
export async function nombresDeResponsables(ctx: Contexto, ids: readonly (string | null)[]) {
  const unicos = [...new Set(ids.filter((i): i is string => Boolean(i)))];
  if (unicos.length === 0) return new Map<string, string>();
  const filas = await ctx.db.membership.findMany({
    where: { userId: { in: unicos } },
    select: { userId: true, user: { select: { name: true } } },
  });
  return new Map(filas.map((f) => [f.userId, f.user.name]));
}
