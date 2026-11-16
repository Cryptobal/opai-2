import { z } from "zod";

import { cursorDe, pagina } from "../core/maestros/comun";
import { instalacionEnAlcance } from "../rondas/comun";
import type { Contexto } from "../types";
import { nombresInstalacion } from "./comun";

/** Cursor y límite de las listas de acceso (CAR-474 / CAR-353). */
export const inputPaginaAcceso = {
  cursor: z.uuid().optional().describe("Id del último ítem de la página anterior."),
  limite: z.number().int().min(1).max(200).default(50),
};

export const reciente = (cursor: string | undefined, limite: number) => ({
  orderBy: [{ horaCorregida: "desc" as const }, { id: "desc" as const }],
  ...cursorDe(cursor, limite),
});

/** Alcance de instalación + página + nombres, para no repetir el armado en registros e intentos. */
export async function paginaAlcance<T extends { id: string; instalacionId: string }, R>(
  ctx: Contexto,
  input: { instalacionId?: string | undefined; cursor?: string | undefined; limite: number },
  buscar: () => Promise<T[]>,
  map: (r: T, instalacion: string) => R,
) {
  if (input.instalacionId) await instalacionEnAlcance(ctx, input.instalacionId);
  const filas = await buscar();
  const { items, siguiente } = pagina(filas, input.limite, input.cursor);
  const nombres = await nombresInstalacion(
    ctx,
    items.map((r) => r.instalacionId),
  );
  return {
    siguiente,
    items: items.map((r) => map(r, nombres.get(r.instalacionId) ?? "")),
  };
}
