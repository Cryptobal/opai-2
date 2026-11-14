import { z } from "zod";

import { rangoDelPeriodo } from "@opai/domain";

import type { Contexto } from "../types";

/**
 * Novedades del mes de una instalación para el cliente, por gravedad (CAR-493): solo cantidades. El texto que escribe
 * el guardia puede nombrar personas, así que no sale del ERP hasta que la empresa decida mostrarlo (Ley 21.719).
 */
export const novedadesSchema = z.object({
  total: z.number().int(),
  alta: z.number().int(),
  media: z.number().int(),
  baja: z.number().int(),
  /** Las que siguen abiertas o en atención. */
  abiertas: z.number().int(),
});
type NovedadesCliente = z.output<typeof novedadesSchema>;

const ABIERTAS = new Set(["abierta", "en_atencion"]);

/** Novedades registradas en el mes (aaaa-mm, zona de la empresa) por instalación del acceso (ADR-022). */
export async function novedadesPorInstalacion(
  ctx: Contexto,
  instalacionIds: readonly string[],
  mes: string,
  zona: string,
): Promise<Map<string, NovedadesCliente>> {
  const { desde, hasta } = rangoDelPeriodo(mes, zona);
  const filas = instalacionIds.length
    ? await ctx.db.novedad.findMany({
        where: { instalacionId: { in: [...instalacionIds] }, createdAt: { gte: desde, lt: hasta } },
        select: { instalacionId: true, gravedad: true, estado: true },
      })
    : [];
  const out = new Map(instalacionIds.map((id) => [id, { total: 0, alta: 0, media: 0, baja: 0, abiertas: 0 }]));
  for (const f of filas) {
    const k = out.get(f.instalacionId);
    if (!k) continue;
    k.total += 1;
    if (f.gravedad === "alta" || f.gravedad === "media" || f.gravedad === "baja") k[f.gravedad] += 1;
    if (ABIERTAS.has(f.estado)) k.abiertas += 1;
  }
  return out;
}
