// Etiquetas de las filas de una lista (negocios, cuentas, contactos) en una sola consulta (CAR-162).
import { z } from "zod";

import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import type { ENTIDADES_ETIQUETA } from "./comun";
import { TONOS_ETIQUETA } from "./comun";

export const etiquetaFilaSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  tono: z.enum(TONOS_ETIQUETA),
});
export const etiquetasFilaSchema = z.array(etiquetaFilaSchema).describe("Etiquetas activas de la fila.");
export const filtroEtiqueta = uuidSchema.optional().describe("Solo las filas con esta etiqueta.");

type Tipo = (typeof ENTIDADES_ETIQUETA)[number];

/** Condición Prisma «tiene la etiqueta»: vacía si no se filtra. */
export const conEtiqueta = (etiquetaId: string | undefined) =>
  etiquetaId ? { etiquetaAsignaciones: { some: { etiquetaId } } } : {};

/** Etiquetas activas por id de fila: lectura acotada a los ids de la página. */
export async function etiquetasDeFilas(ctx: Contexto, tipo: Tipo, ids: string[]) {
  const porId = new Map<string, z.infer<typeof etiquetasFilaSchema>>();
  if (!ids.length) return (id: string) => porId.get(id) ?? [];
  const col = `${tipo}Id` as const;
  const filas = await ctx.db.etiquetaAsignacion.findMany({
    where: { [col]: { in: ids }, etiqueta: { activa: true } },
    include: { etiqueta: { select: { id: true, nombre: true, tono: true } } },
    orderBy: { etiqueta: { nombre: "asc" } },
  });
  for (const f of filas) {
    const dueno = f[col];
    if (!dueno) continue;
    const e = f.etiqueta;
    const lista = porId.get(dueno) ?? [];
    lista.push({ id: e.id, nombre: e.nombre, tono: e.tono as (typeof TONOS_ETIQUETA)[number] });
    porId.set(dueno, lista);
  }
  return (id: string) => porId.get(id) ?? [];
}
