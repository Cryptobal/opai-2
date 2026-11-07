import { z } from "zod";

import { noEncontrado, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";

export const iso = (d: Date) => d.toISOString();
export const fechaHora = z.string().datetime({ offset: true });

/** El dispositivo de esta petición, activo, o el error que corresponde (revocado se distingue en `detalles`). */
export async function dispositivoActivo(ctx: Contexto, dispositivoId: string) {
  const d = await ctx.db.dispositivo.findFirst({
    where: { id: dispositivoId },
    select: { id: true, instalacionId: true, estado: true },
  });
  if (!d) throw noEncontrado("El dispositivo");
  if (d.estado !== "activo") {
    throw reglaDeNegocio("Este dispositivo ya no está emparejado.", { revocado: true });
  }
  return d;
}
