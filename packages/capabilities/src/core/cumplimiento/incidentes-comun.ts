import { z } from "zod";

import { noEncontrado } from "../../errores";
import type { Contexto } from "../../types";

export const incidenteVista = z.object({
  casoId: z.string(),
  estado: z.string(),
  ultimoEvento: z.string(),
  registradoEn: z.string(),
});

/** Última fila (estado vigente) de un caso; NOT_FOUND si el caso no existe. Desempata por id (uuid7). */
export async function ultimoHecho(ctx: Contexto, casoId: string) {
  const f = await ctx.db.incidente.findFirst({
    where: { casoId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  if (!f) throw noEncontrado("El incidente");
  return f;
}

export const salidaIncidente = (f: {
  casoId: string;
  estado: string;
  evento: string;
  createdAt: Date;
}) => ({
  casoId: f.casoId,
  estado: f.estado,
  ultimoEvento: f.evento,
  registradoEn: f.createdAt.toISOString(),
});
