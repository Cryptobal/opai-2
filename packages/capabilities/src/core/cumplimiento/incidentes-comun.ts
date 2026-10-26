import { z } from "zod";

import type { TenantTx } from "@opai/db";

import { noEncontrado } from "../../errores";

export const incidenteVista = z.object({
  casoId: z.string(),
  estado: z.string(),
  ultimoEvento: z.string(),
  registradoEn: z.string(),
});

/**
 * Última fila (estado vigente) de un caso; NOT_FOUND si no existe. Desempata por id (uuid7). Recibe
 * el cliente (db o tx) para poder leer el estado y escribir el hecho nuevo en la misma transacción
 * (sin TOCTOU): como la tabla es append-only, el avance se valida y se anota atómicamente.
 */
export async function ultimoHecho(db: TenantTx, casoId: string) {
  const f = await db.incidente.findFirst({
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
